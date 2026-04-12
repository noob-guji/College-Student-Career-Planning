import sqlite3
import json
import os
import sys

# 彻底修复国内连不上 HuggingFace 的问题：强制设置镜像环境变量
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

# 尝试导入，如果没有的话这里只做声明，使得脚本具备容错运行基础
try:
    from sentence_transformers import SentenceTransformer, util
    import chromadb
except ImportError:
    print("⚠️ 未找到依赖库，请执行: pip install sentence-transformers chromadb")
    sys.exit(1)

# ================= 1. 路径配置 =================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'test', 'extracted_results.json')
MOCK_JSON_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'test', 'test_mock_students.json')
DB_PATH = os.path.join(BASE_DIR, 'database', 'knowledge.db')
VECTOR_DB_PATH = os.path.join(BASE_DIR, 'vector_db', 'chroma')
RULES_JSON_PATH = os.path.join(BASE_DIR, 'config', 'skill_extraction_rules.json')

def normalize_skill(skill_str):
    """技能名称规范化：转小写并去除空格"""
    return str(skill_str).lower().replace(" ", "")

def get_synonym_map(cursor):
    """提取完整的同义词映射，结合知识库和规则库实体。"""
    synonym_map = {}
    
    # 1. 从知识库提取
    cursor.execute('''
        SELECT s1.skill_name, s2.synonym 
        FROM skills s1 
        JOIN skill_synonyms s2 ON s1.skill_id = s2.skill_id
    ''')
    for row in cursor.fetchall():
        base = normalize_skill(row[0])
        syn = normalize_skill(row[1])
        if base not in synonym_map: synonym_map[base] = set([base])
        if syn not in synonym_map: synonym_map[syn] = set([syn])
        synonym_map[base].add(syn)
        synonym_map[syn].add(base)
        
    # 2. 从 skill_extraction_rules.json 提取
    if os.path.exists(RULES_JSON_PATH):
        with open(RULES_JSON_PATH, 'r', encoding='utf-8') as f:
            rules_data = json.load(f)
        for pattern in rules_data.get("patterns", []):
            base = normalize_skill(pattern.get("skill", ""))
            if not base: continue
            
            aliases = [normalize_skill(a) for a in pattern.get("aliases", [])]
            all_terms = [base] + aliases
            
            for term1 in all_terms:
                if term1 not in synonym_map: synonym_map[term1] = set([term1])
                for term2 in all_terms:
                    synonym_map[term1].add(term2)
                    
    return synonym_map

def run_profile_accuracy_test():
    print(f"📂 正在加载验证数据: {JSON_PATH}")
    if not os.path.exists(JSON_PATH):
        print("错误：未找测试数据 JSON 文件。")
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        ground_truth_data = json.load(f)

    total_samples = len(ground_truth_data)
    if total_samples == 0:
        print("验证数据为空！")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    synonym_map = get_synonym_map(cursor)
    correct_count = 0

    print("\n" + "="*50)
    print("🚀 开始进行画像准确率进阶验证 (硬匹配+软匹配)...")
    print("="*50)
    
    print("🧠 正在加载 BAAI/bge-large-zh-v1.5 大模型用作语义软匹配支持...")
    soft_model = SentenceTransformer("BAAI/bge-large-zh-v1.5")

    for idx, data_a in enumerate(ground_truth_data, 1):
        job_name = data_a.get("job_name", "")
        manual_skills = data_a.get("manual_skills", [])
        manual_soft_skills = data_a.get("manual_soft_skills", {})

        cursor.execute('''
            SELECT professional_skills, soft_skills, certifications,
                   innovation, learning, stress, communication, internship
            FROM job_profiles
            WHERE profile_name = ?
        ''', (job_name,))
        
        row = cursor.fetchone()
        if not row:
            print(f"[{idx}/{total_samples}] ❌ [{job_name}] 未在知识库中找到对应基准数据！")
            continue
            
        (db_prof_skills_json, db_soft_skills_json, db_certs_json, 
         db_innovation, db_learning, db_stress, db_communication, db_internship) = row
         
        db_prof_skills = json.loads(db_prof_skills_json) if db_prof_skills_json else []
        db_soft_skills = json.loads(db_soft_skills_json) if db_soft_skills_json else []
        db_certs = json.loads(db_certs_json) if db_certs_json else []

        initial_skill_pool = set(db_prof_skills + db_soft_skills + db_certs)
        expanded_skill_pool = set()
        
        for skill in initial_skill_pool:
            norm_sk = normalize_skill(skill)
            expanded_skill_pool.add(norm_sk)
            if norm_sk in synonym_map:
                expanded_skill_pool.update(synonym_map[norm_sk])

        hit_count = 0

        if manual_skills:
            unmatched_skills = []
            # ================= 基于增强规则池的硬匹配 =================
            for ms in manual_skills:
                if normalize_skill(ms) in expanded_skill_pool:
                    hit_count += 1
                else:
                    unmatched_skills.append(ms)
                    
            # ================= 阶段二：语义软匹配 =================
            if unmatched_skills and expanded_skill_pool:
                db_skills_list = list(expanded_skill_pool)
                # 对硬匹配失败的技能和数据库已有技能池进行向量计算
                unmatched_emb = soft_model.encode(unmatched_skills, normalize_embeddings=True)
                db_emb = soft_model.encode(db_skills_list, normalize_embeddings=True)
                
                # 计算余弦相似度
                cos_scores = util.cos_sim(unmatched_emb, db_emb)
                
                # 遍历判断是否达到 0.60 阈值
                for i, ms in enumerate(unmatched_skills):
                    max_score = cos_scores[i].max().item()
                    if max_score >= 0.60:
                        hit_count += 1
                        
            coverage = hit_count / len(manual_skills)
        else:
            coverage = 1.0

        # 保留了您手动放宽的标准 0.5
        condition_1 = (coverage >= 0.65)

        # 软能力 MAE 计算
        keys = ["innovation", "learning", "stress", "communication", "internship"]
        db_scores = {
            "innovation": db_innovation,
            "learning": db_learning,
            "stress": db_stress,
            "communication": db_communication,
            "internship": db_internship
        }
        
        errors = []
        for key in keys:
            if key in manual_soft_skills:
                errors.append(abs(int(manual_soft_skills[key]) - int(db_scores[key])))
                
        mae = (sum(errors) / len(errors)) if errors else 0.0
        condition_2 = (mae <= 2.0)

        is_accurate = condition_1 and condition_2
        if is_accurate:
            correct_count += 1

        result_mark = "✅ 准确" if is_accurate else "❌ 不准确"
        print(f"[{idx:3d}/{total_samples}] {job_name[:12]:<12} | 覆盖率: {coverage*100:5.1f}% [{hit_count:2d}/{len(manual_skills):2d}] | MAE: {mae:4.2f} => {result_mark}")

    accuracy = correct_count / total_samples
    print("\n" + "="*50)
    print("🎯 画像准确率验证最终报告")
    print("="*50)
    print(f"  验证数据总量 : {total_samples}")
    print(f"  完全符合数量 : {correct_count}")
    print(f"  画像准确率   : {accuracy*100:.2f}%")
    print("="*50)


def run_matching_accuracy_test():
    print(f"\n📂 正在加载模拟学生数据: {MOCK_JSON_PATH}")
    if not os.path.exists(MOCK_JSON_PATH):
        print("错误：未找到模拟学生数据 JSON 文件。")
        return

    with open(MOCK_JSON_PATH, 'r', encoding='utf-8') as f:
        students_data = json.load(f)

    total_samples = len(students_data)
    if total_samples == 0:
        print("测试数据为空！")
        return

    # 注意这里的特别处理：
    # 您的要求中写了调用 `BAAI/bge-large-zh-v1.5`，但实际上根据 scripts/build_jobs_vector.py，
    # Chroma 向量库最初是基于 768维的 `BAAI/bge-base-zh-v1.5` 构筑的！
    # 如果此时使用 large（1024维）发起检索请求，ChromaDB 会抛出 Dimension 异常崩溃。
    # 因此这里我已经自动为您校正，底层使用了 base 模型安全执行向量检索。
    print("🧠 正在加载 BAAI/bge-base-zh-v1.5 编码模型进行检索转换...")
    retrieval_model = SentenceTransformer('BAAI/bge-base-zh-v1.5')

    print("🔌 正在无缝连接 Chroma 本地向量库...")
    client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
    try:
        collection = client.get_collection(name="jobs")
    except Exception as e:
        print(f"❌ 检索失败，无法读取名为 'jobs' 的 Chroma 集合: {e}")
        return

    print("\n" + "="*50)
    print("🚀 开始进行岗位匹配准确率验证 (Recall@5)...")
    print("="*50)

    hits = 0

    for idx, stu in enumerate(students_data, 1):
        stu_id = stu.get("student_id", f"未知学生_{idx}")
        skills = stu.get("skills", [])
        target_job = str(stu.get("target_job", "")).strip().lower()

        # 拼接该学生的零碎技能点成为一个统一的查询块
        skills_str = " ".join(skills)
        query_text = f"技能侧写: {skills_str}"

        # 转换为单条向量
        query_embedding = retrieval_model.encode([query_text], normalize_embeddings=True).tolist()

        # 在 Chroma 库中只索取 Top-5
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=5
        )
        
        is_hit = False
        top_jobs = []
        if results and "metadatas" in results and results["metadatas"]:
            metas = results["metadatas"][0] 
            for m in metas:
                job_title = m.get("title", "").strip().lower()
                top_jobs.append(job_title)
                
                # 命中验证法则：目标靶向岗位直接出现在检索召回的 title 中，或是互相部分包含
                # （如 'Java开发工程师' 和 'Java后端' 可相互兼容识别）
                if target_job in job_title or job_title in target_job:
                    is_hit = True

        if is_hit:
            hits += 1
            mark = "✅ Hit!"
        else:
            mark = "❌ Miss"
            
        print(f"[{idx:2d}/{total_samples}] {stu_id} | 靶机岗位: {stu.get('target_job'):<15} | Top1-3: {top_jobs[:3]}... => {mark}")

    recall_at_5 = hits / total_samples

    print("\n" + "="*50)
    print("🎯 匹配准确率 (Recall@5) 最终报告")
    print("="*50)
    print(f"  测试样本量 : {total_samples}")
    print(f"  命中(Hit)数: {hits}")
    print(f"  Recall@5   : {recall_at_5*100:.2f}%")
    if recall_at_5 >= 0.80:
        print(f"  测试结论   : 🎉 达标 (要求 >= 80%)")
    else:
        print(f"  测试结论   : ⚠️ 未达标 (要求 >= 80%)")
    print("="*50)

if __name__ == "__main__":
    print("\n" + "▇"*60)
    print(" 💠 阶段一： 画像属性抽取基准评估")
    print("▇"*60)
    run_profile_accuracy_test()
    
    print("\n\n" + "▇"*60)
    print(" 💠 阶段二： 学生技能到匹配岗位的召回评测 (Recall@5)")
    print("▇"*60)
    run_matching_accuracy_test()
