import sqlite3
import pandas as pd
import numpy as np
import os
from sentence_transformers import SentenceTransformer
import faiss

# ---------- 0. 路径 ----------
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(project_root, "database", "knowledge.db")

# ---------- 1. 读取技能 ----------
conn = sqlite3.connect(db_path)
skills_df = pd.read_sql('SELECT skill_id, skill_name FROM skills', conn)

skill_names = skills_df['skill_name'].tolist()
skill_ids = skills_df['skill_id'].tolist()

# ========== 修复核心：运行前清空旧数据，避免重复插入 ==========
conn.execute("DELETE FROM skill_synonyms")
conn.execute("DELETE FROM skill_hierarchy")
conn.commit()

# ---------- 2. 创建 synonym 表 ----------
conn.execute("""
CREATE TABLE IF NOT EXISTS skill_synonyms (
    skill_id INTEGER,
    synonym TEXT
)
""")

# ---------- 3. 基础同义词（规则） ----------
def normalize(s):
    return s.lower().replace(" ", "")

norm_map = {}

for name in skill_names:
    key = normalize(name)
    if key not in norm_map:
        norm_map[key] = []
    norm_map[key].append(name)

cursor = conn.cursor()

# 写入规则同义词
for key, group in norm_map.items():
    if len(group) > 1:
        base = group[0]
        base_id = skills_df[skills_df['skill_name'] == base]['skill_id'].values[0]

        for g in group[1:]:
            cursor.execute(
                "INSERT INTO skill_synonyms (skill_id, synonym) VALUES (?, ?)",
                (base_id, g)
            )

print("✅ 基础同义词完成")

# ---------- 4. embedding 相似技能 ----------
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')

vectors = model.encode(skill_names, normalize_embeddings=True)
vectors = vectors.astype(np.float32)

index = faiss.IndexFlatIP(vectors.shape[1])
index.add(vectors)

# ---------- 5. 相似度阈值 ----------
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')
vectors = model.encode(skill_names, normalize_embeddings=True).astype(np.float32)
index = faiss.IndexFlatIP(vectors.shape[1])
index.add(vectors)

SIM_THRESHOLD = 0.7
for i, vec in enumerate(vectors):
    D, I = index.search(vec.reshape(1, -1), 5)
    for j, score in zip(I[0], D[0]):
        if i != j and score > SIM_THRESHOLD:
            cursor.execute(
                "INSERT INTO skill_synonyms (skill_id, synonym) VALUES (?, ?)",
                (skill_ids[i], skill_names[j])
            )
print("✅ embedding 同义词完成")

# ---------- 6. 上下位关系 ----------
conn.execute("""
CREATE TABLE IF NOT EXISTS skill_hierarchy (
    parent_skill TEXT,
    child_skill TEXT
)
""")

# ======================== ✅ 核心升级：递归插入多层级技能树 ========================
def insert_hierarchy(parent, children):
    """
    递归插入多层级技能分类树
    parent: 父分类名称
    children: 子节点（列表/嵌套字典）
    """
    # 如果子节点是列表（直接是技能）
    if isinstance(children, list):
        for child in children:
            if child in skill_names:
                cursor.execute(
                    "INSERT INTO skill_hierarchy (parent_skill, child_skill) VALUES (?, ?)",
                    (parent, child)
                )
    # 如果子节点是嵌套字典（继续递归）
    elif isinstance(children, dict):
        for child_name, grand_children in children.items():
            # 插入当前层级的父子关系
            cursor.execute(
                "INSERT INTO skill_hierarchy (parent_skill, child_skill) VALUES (?, ?)",
                (parent, child_name)
            )
            # 递归插入下一级
            insert_hierarchy(child_name, grand_children)

# 手工规则:多层级树形技能体系（建议后期扩展）
hierarchy_rules = {
    "职业技能总库": {
        # ====================== 1. 信息技术（核心技术岗）======================
        "信息技术": {
            "编程语言": ["Python", "Java", "C++", "C", "C#", "JavaScript", "JS", "Go", "R"],
            "前端开发": ["HTML", "HTML5", "CSS", "CSS3", "Vue", "React", "Angular", "ES6", "Ajax", "TypeScript", "Webpack", "Vite"],
            "后端开发": ["Spring Boot", "Spring", "MyBatis", "微服务"],
            "数据库技术": ["MySQL", "SQL", "Oracle", "SQL Server", "Redis", "Hive", "MongoDB", "数据库设计", "数据库管理"],
            "大数据与AI": ["大数据分析", "Spark", "Hadoop", "Flink", "人工智能", "机器学习", "深度学习"],
            "软件测试": ["软件测试", "功能测试", "自动化测试", "接口测试", "性能测试", "安全测试", "稳定性测试", "可靠性测试", "Selenium", "Robot Framework", "测试用例编写", "测试计划制定"],
            "运维与服务器": ["Linux", "服务器", "Docker", "Kubernetes", "Nginx", "ERP", "MES", "WMS", "ERP系统操作", "信息系统实施"],
            "开发工具": ["Git", "VS Code", "PyCharm", "IDEA", "JIRA", "Xmind", "Axure", "Visio", "AutoCAD", "CAD", "Photoshop", "PS"]
        },

        # ====================== 2. 电商与新媒体运营 ======================
        "电商运营": {
            "平台运营": ["淘宝运营", "天猫运营", "京东运营", "亚马逊运营", "阿里巴巴国际站运营", "抖音运营", "小红书运营", "公众号运营", "微信公众号运营", "微博运营", "电商平台运营"],
            "广告投放": ["直通车", "钻展", "淘宝客", "超级推荐", "百度推广", "信息流广告投放", "Facebook广告投放", "Google广告投放", "广告投放优化", "SEO", "SEO优化", "搜索引擎优化"],
            "运营能力": ["店铺运营", "产品运营", "内容运营", "用户运营", "社群运营", "活动策划", "活动企划", "爆款打造", "投放优化", "流量引入"]
        },

        # ====================== 3. 市场营销与销售 ======================
        "市场营销": {
            "市场工作": ["市场调研", "市场分析", "市场拓展", "市场开拓", "竞品分析", "竞争对手分析", "营销策划", "品牌推广", "市场营销", "网络营销", "网络推广"],
            "销售工作": ["销售", "客户开发", "客户维护", "渠道管理", "渠道开拓", "经销商管理", "销售管理", "销售策略", "商务谈判", "谈判技巧"]
        },

        # ====================== 4. 人力资源管理 ======================
        "人力资源": {
            "招聘配置": ["招聘", "招聘管理", "简历筛选", "人才寻访", "背景调查", "招聘渠道管理"],
            "培训发展": ["培训", "培训管理", "课程开发", "培训体系建立", "培训需求分析"],
            "薪酬绩效": ["薪酬福利管理", "绩效管理", "绩效考核", "薪酬核算", "考勤管理", "员工关系管理"],
            "人事事务": ["员工入职离职管理", "社保公积金办理", "人力资源数据分析", "人事信息管理"]
        },

        # ====================== 5. 法律与知识产权 ======================
        "法律合规": {
            "法律事务": ["法律咨询", "合同起草", "合同审查", "合同审核", "法律文书写作", "诉讼", "仲裁", "诉讼代理", "非诉业务", "法律风险评估"],
            "知识产权": ["专利申请", "专利撰写", "专利检索", "专利分析", "专利审查", "专利诉讼", "专利无效", "专利挖掘"]
        },

        # ====================== 6. 生产制造与质量管理 ======================
        "生产质量": {
            "质量管理": ["质量检验", "质量控制", "QC七大手法", "IATF16949", "ISO9001", "FMEA", "SPC", "MSA", "APQP", "PPAP", "8D报告"],
            "生产管理": ["现场管理", "设备管理", "设备维护", "设备调试", "危化安全生产", "库存管理", "供应链管理"]
        },

        # ====================== 7. 工程技术与硬件 ======================
        "工程技术": {
            "硬件工程": ["模拟电路", "数字电路", "电气系统检查", "硬件测试", "示波器", "万用表", "量具使用"],
            "机械工程": ["机械设计", "机械制造", "汽车机械基础", "CAD制图", "材料学"],
            "工程施工": ["技术改造", "试运行", "大部件更换协助", "定期巡检", "风机巡检", "故障处理"]
        },

        # ====================== 8. 生物与科研 ======================
        "生物科研": [
            "生物信息学", "分子生物学", "细胞生物学", "生物化学", "细胞培养", "动物实验", "基因编辑",
            "文献检索", "科研项目管理", "方法验证", "理化检测", "采样"
        ],

        # ====================== 9. 办公通用技能 ======================
        "办公技能": {
            "办公软件": ["Excel", "Word", "PPT", "PPT制作", "Office", "Microsoft Office", "办公软件操作", "熟练使用办公软件"],
            "数据处理": ["数据分析", "数据统计与分析", "数据清洗", "数据挖掘", "数据可视化", "Tableau", "SPSS", "SAS"],
            "通用办公": ["文件管理", "公文写作", "会议组织", "档案管理", "档案整理", "档案数字化", "打字", "普通话标准"]
        },

        # ====================== 10. 客户服务与商务 ======================
        "客户服务": [
            "客户服务", "在线客服", "线上客服", "客户投诉处理", "客户关系管理", "商务接待", "商务礼仪",
            "供应商管理", "供应商开发", "招投标", "招标文件编制", "标书制作"
        ],

        # ====================== 11. 语言能力 ======================
        "语言能力": [
            "英语", "英语听说读写", "英语翻译", "中英文互译", "笔译", "同声传译",
            "日语", "商务日语", "日语精通", "法语", "方言能力"
        ],

        # ====================== 12. 综合管理与软技能 ======================
        "综合能力": [
            "项目管理", "团队管理", "成本控制", "财务管理", "风险管理", "流程优化",
            "沟通协调", "逻辑分析", "分析判断", "执行力", "团队合作精神"
        ]
    }
}

# 执行递归插入
insert_hierarchy("顶层", hierarchy_rules)
print("✅ 多层级技能树构建完成")

conn.commit()
conn.close()

print("🎉 高级技能关系构建完成")