"""
build_lateral_paths.py
======================
负责人B · 岗位图谱知识库 3.2 水平转岗路径

输入 : vector_db/chroma/  （A产出的 ChromaDB 岗位向量库）
       data/processed/jobs_cleaned.csv （兜底：当向量库不可用时）
输出 : data/knowledge_graph/lateral_paths.json

数据源优先级
-----------
1. ChromaDB Client API          → 使用真实岗位 embedding
2. ChromaDB SQLite 直读         → 解析 chroma.sqlite3 中的 embedding_metadata
3. TF-IDF on jobs_cleaned.csv  → 离线兜底，基于岗位详情文本相似度
"""

import os, re, json, logging, sqlite3
import numpy as np
import pandas as pd
from pathlib import Path
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 路径配置
# ──────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
CHROMA_DIR = BASE_DIR / "vector_db" / "chroma"
CSV_PATH   = BASE_DIR / "data" / "processed" / "jobs_cleaned.csv"
GRAPH_DIR  = BASE_DIR / "data" / "knowledge_graph"
OUTPUT_JSON= GRAPH_DIR / "lateral_paths.json"
GRAPH_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────
# 核心岗位列表（至少 5 个，覆盖多个职能方向）
# ──────────────────────────────────────────────
CORE_JOBS = [
    "软件测试工程师",    # 匹配：测试工程师 / 软件测试
    "前端开发工程师",    # 匹配：前端开发
    "数据分析师",        # 精确匹配
    "产品经理",          # 匹配：产品专员/助理
    "Java开发工程师",    # 匹配：Java
    "运营专员",          # 匹配：运营助理/专员
    "销售经理",          # 匹配：销售工程师 / 销售运营
    "项目经理",          # 匹配：项目经理/主管
    "实施工程师",        # 精确匹配
    "技术支持工程师",    # 精确匹配
]

TOP_N = 5   # 每个核心岗位取相似度最高的 N 个候选

# ──────────────────────────────────────────────
# 规则库：技能差距 & 难度 & 推荐行动
# ──────────────────────────────────────────────
SKILL_GAP_RULES = {
    # (源大类关键词, 目标大类关键词) -> {"skills": [...], "difficulty": "低/中/高", "action": "..."}
    ("测试", "开发"):       {"skills": ["编程基础(Python/Java)", "数据结构", "Git版本管理"],
                             "difficulty": "中",
                             "action": "参加编程训练营 + 完成2个开源项目"},
    ("开发", "测试"):       {"skills": ["测试理论", "自动化测试框架(Selenium/Pytest)", "性能测试"],
                             "difficulty": "低",
                             "action": "考取 ISTQB 认证，实践自动化测试项目"},
    ("开发", "产品"):       {"skills": ["用户需求分析", "产品原型设计(Axure)", "数据驱动决策"],
                             "difficulty": "中",
                             "action": "参与产品规划会议，学习 PRD 写作"},
    ("产品", "开发"):       {"skills": ["至少一门编程语言", "系统设计", "API 理解"],
                             "difficulty": "高",
                             "action": "系统学习计算机基础课程，完成实战项目"},
    ("开发", "数据"):       {"skills": ["SQL进阶", "统计学", "数据可视化(Tableau/Power BI)"],
                             "difficulty": "低",
                             "action": "完成数据分析认证课程，积累业务分析案例"},
    ("数据", "开发"):       {"skills": ["工程化编程(Java/Go)", "系统设计", "微服务架构"],
                             "difficulty": "中",
                             "action": "学习后端开发课程，参与数据平台建设项目"},
    ("数据", "产品"):       {"skills": ["用户体验设计", "竞品分析", "商业敏感度"],
                             "difficulty": "低",
                             "action": "主导一次数据驱动的产品迭代，积累 PRD 经验"},
    ("产品", "运营"):       {"skills": ["用户增长策略", "渠道运营", "内容策划"],
                             "difficulty": "低",
                             "action": "负责一条产品线的完整运营周期"},
    ("运营", "产品"):       {"skills": ["需求分析与拆解", "原型工具", "技术沟通能力"],
                             "difficulty": "中",
                             "action": "参与产品需求评审，学习 PRD 和竞品分析"},
    ("销售", "商务"):       {"skills": ["合同谈判", "资源整合", "行业洞察"],
                             "difficulty": "低",
                             "action": "积累大客户合作经验，拓展行业人脉"},
    ("运营", "数据"):       {"skills": ["SQL", "Excel数据透视", "AB测试方法论"],
                             "difficulty": "中",
                             "action": "自学 SQL + 数据分析认证，在现岗搭建运营数据看板"},
    ("测试", "运维"):       {"skills": ["Linux运维", "CI/CD流水线", "容器化(Docker/K8s)"],
                             "difficulty": "中",
                             "action": "考取 CKA 认证，参与 DevOps 实践项目"},
    ("开发", "算法"):       {"skills": ["机器学习理论", "Python数据科学栈", "数学统计"],
                             "difficulty": "高",
                             "action": "系统学习 ML 课程(Coursera/吴恩达)，完成 Kaggle 比赛"},
    ("算法", "开发"):       {"skills": ["工程化编程规范", "系统设计", "大规模服务部署"],
                             "difficulty": "中",
                             "action": "参与模型工程化项目，学习 MLOps 最佳实践"},
    ("设计", "产品"):       {"skills": ["需求文档撰写", "用户调研", "数据分析入门"],
                             "difficulty": "低",
                             "action": "主导 UX 研究项目，转型为 UX Research + PM"},
    ("产品", "设计"):       {"skills": ["UI设计工具(Figma/Sketch)", "视觉规范", "用户体验方法论"],
                             "difficulty": "中",
                             "action": "完成 UI/UX 设计课程，构建个人作品集"},
}

DEFAULT_RULE = {"skills": ["行业知识迁移", "跨部门沟通", "新技能学习"],
                "difficulty": "中",
                "action": "寻找内部轮岗机会或参加相关培训"}

# 职能大类关键词（用于规则匹配）
FUNC_TAGS = {
    "测试":  ["测试", "qa", "quality"],
    "开发":  ["开发", "工程师", "java", "python", "c++", "前端", "后端", "android", "ios", "嵌入式"],
    "数据":  ["数据", "分析", "bi", "统计"],
    "产品":  ["产品", "pm"],
    "运营":  ["运营", "operation"],
    "销售":  ["销售", "sale", "bd"],
    "商务":  ["商务", "business"],
    "设计":  ["设计", "ui", "ux", "视觉"],
    "算法":  ["算法", "algorithm", "ai", "机器学习", "深度学习"],
    "运维":  ["运维", "devops", "ops"],
    "项目":  ["项目", "project", "pmo"],
}


def _get_func_tag(title: str) -> str:
    t = title.lower()
    for tag, kws in FUNC_TAGS.items():
        if any(k in t for k in kws):
            return tag
    return "其他"


def _lookup_rule(src: str, tgt: str) -> dict:
    src_tag = _get_func_tag(src)
    tgt_tag = _get_func_tag(tgt)
    for (s, t), rule in SKILL_GAP_RULES.items():
        if s in src_tag and t in tgt_tag:
            return rule
    return DEFAULT_RULE


def _sim_to_difficulty(sim: float, rule_diff: str) -> str:
    """相似度越低说明差距越大，难度越高；综合规则库调整"""
    if sim >= 0.80:
        base = "低"
    elif sim >= 0.65:
        base = "中"
    else:
        base = "高"
    # 取规则库和相似度推断的较高难度
    rank = {"低": 0, "中": 1, "高": 2}
    return ["低", "中", "高"][max(rank[base], rank[rule_diff])]


# ══════════════════════════════════════════════
# 数据源 1：ChromaDB Client API
# ══════════════════════════════════════════════
def _load_from_chromadb_client(chroma_dir: Path):
    """返回 (titles, matrix) 或 None"""
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(chroma_dir))
        collections = client.list_collections()
        if not collections:
            logger.warning("ChromaDB 中没有 collection，跳过")
            return None
        col = collections[0]
        logger.info("ChromaDB collection: %s", col.name)
        data = col.get(include=["embeddings", "metadatas"])
        embeddings = np.array(data["embeddings"], dtype=np.float32)
        titles = [
            m.get("title") or m.get("job_title") or m.get("name") or str(i)
            for i, m in enumerate(data["metadatas"])
        ]
        logger.info("ChromaDB：加载 %d 条向量（dim=%d）", len(titles), embeddings.shape[1])
        return titles, embeddings
    except Exception as e:
        logger.warning("ChromaDB Client 加载失败：%s", e)
        return None


# ══════════════════════════════════════════════
# 数据源 2：直读 ChromaDB SQLite
# ══════════════════════════════════════════════
def _load_from_chroma_sqlite(chroma_dir: Path):
    """
    直接读取 chroma.sqlite3 中的 embedding_metadata + embeddings 表。
    适配图示中的表结构。
    """
    sqlite_path = chroma_dir / "chroma.sqlite3"
    if not sqlite_path.exists():
        logger.warning("未找到 chroma.sqlite3：%s", sqlite_path)
        return None
    try:
        con = sqlite3.connect(str(sqlite_path))
        cur = con.cursor()

        # 获取所有 embedding id 和对应的元数据
        cur.execute("SELECT id, key, string_value FROM embedding_metadata WHERE key IN ('title','job_title','name')")
        rows = cur.fetchall()
        id2title = {}
        for eid, key, val in rows:
            if val:
                id2title[eid] = val

        if not id2title:
            logger.warning("embedding_metadata 中未找到 title 字段")
            con.close()
            return None

        # 读取 embeddings 表的向量（存储为 BLOB 二进制 float32 数组）
        cur.execute("SELECT id, embedding FROM embeddings WHERE id IN ({})".format(
            ",".join("?" * len(id2title))), list(id2title.keys()))
        emb_rows = cur.fetchall()
        con.close()

        titles, vecs = [], []
        for eid, blob in emb_rows:
            if blob and eid in id2title:
                vec = np.frombuffer(blob, dtype=np.float32)
                titles.append(id2title[eid])
                vecs.append(vec)

        if not vecs:
            logger.warning("SQLite 中未读取到有效向量")
            return None

        matrix = np.vstack(vecs)
        logger.info("SQLite 直读：%d 条向量（dim=%d）", len(titles), matrix.shape[1])
        return titles, matrix
    except Exception as e:
        logger.warning("SQLite 直读失败：%s", e)
        return None


# ══════════════════════════════════════════════
# 数据源 3：TF-IDF 兜底（基于 jobs_cleaned.csv）
# ══════════════════════════════════════════════
def _load_from_tfidf(csv_path: Path):
    """
    对每个唯一岗位名称，聚合其所有 job_detail 文本，
    用 TF-IDF 向量化后作为岗位向量。
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    logger.info("TF-IDF 兜底模式：读取 %s", csv_path)
    df = pd.read_csv(csv_path)
    df = df[["岗位名称", "岗位详情", "所属行业"]].dropna(subset=["岗位名称"])
    df["岗位详情"] = df["岗位详情"].fillna("")

    # 聚合同名岗位的文本
    agg = df.groupby("岗位名称")["岗位详情"].apply(lambda x: " ".join(x)).reset_index()
    agg.columns = ["title", "text"]

    # 过滤掉文本过短的岗位
    agg = agg[agg["text"].str.len() > 50].reset_index(drop=True)

    logger.info("TF-IDF：岗位种类 %d 个", len(agg))

    vectorizer = TfidfVectorizer(
        max_features=3000,
        token_pattern=r"[\u4e00-\u9fa5a-zA-Z0-9]+",
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(agg["text"]).toarray().astype(np.float32)
    titles = agg["title"].tolist()
    logger.info("TF-IDF 矩阵：%s", matrix.shape)
    return titles, matrix


# ══════════════════════════════════════════════
# 余弦相似度计算
# ══════════════════════════════════════════════
def cosine_sim_matrix(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9
    normed = matrix / norms
    return normed @ normed.T


def find_top_similar(job_name: str, titles: list, sim_mat: np.ndarray, top_n: int = TOP_N):
    """找到与 job_name 最相似的 top_n 个岗位（排除自身），支持多级模糊匹配"""
    def _resolve(name: str) -> str | None:
        # 1. 精确匹配
        if name in titles:
            return name
        # 2. 子串匹配（name 包含 title 或 title 包含 name）
        matched = [t for t in titles if name in t or t in name]
        if matched:
            return matched[0]
        # 3. 关键词匹配（取岗位名中的核心词）
        core_words = re.sub(r"[工程师经理专员助理总监主管]", "", name)
        core_words = [w for w in re.findall(r"[\u4e00-\u9fa5a-zA-Z0-9]+", core_words) if len(w) >= 2]
        for cw in core_words:
            for t in titles:
                if cw in t:
                    return t
        return None

    resolved = _resolve(job_name)
    if resolved is None:
        logger.warning("目标岗位 '%s' 不在向量库中，跳过", job_name)
        return []
    if resolved != job_name:
        logger.info("  '%s' → 匹配为 '%s'", job_name, resolved)

    idx = titles.index(resolved)
    sims = sim_mat[idx].copy()
    sims[idx] = -1  # 排除自身

    top_indices = np.argsort(sims)[::-1][:top_n]
    results = []
    for i in top_indices:
        if sims[i] < 0.01:
            continue
        results.append({
            "target_job": titles[i],
            "similarity": round(float(sims[i]), 4),
        })
    return results


# ══════════════════════════════════════════════
# 构建 lateral_paths 结构
# ══════════════════════════════════════════════
def build_lateral_paths(titles: list, sim_mat: np.ndarray, source_mode: str) -> dict:
    lateral_paths = {}

    for core_job in CORE_JOBS:
        candidates = find_top_similar(core_job, titles, sim_mat, top_n=TOP_N)
        if not candidates:
            logger.warning("  '%s'：未找到相似岗位", core_job)
            continue

        paths = []
        for cand in candidates:
            tgt  = cand["target_job"]
            sim  = cand["similarity"]
            rule = _lookup_rule(core_job, tgt)

            diff = _sim_to_difficulty(sim, rule["difficulty"])
            paths.append({
                "目标岗位":     tgt,
                "相似度得分":   sim,
                "所需补充技能": rule["skills"],
                "难度":         diff,
                "预计过渡周期": "3-6个月" if diff == "低" else ("6-12个月" if diff == "中" else "12-24个月"),
                "推荐行动":     rule["action"],
                "薪资变化参考": _salary_delta(diff),
            })

        lateral_paths[core_job] = {
            "source_job": core_job,
            "paths": paths[:TOP_N],  # 至少2条，最多 TOP_N 条
        }
        logger.info("  ✔ '%s' → %d 条转岗路径", core_job, len(paths))

    return {
        "meta": {
            "total_core_jobs": len(lateral_paths),
            "vector_source": source_mode,
            "top_n_per_job": TOP_N,
            "description": (
                "水平转岗路径知识库。similarity 为余弦相似度（0-1），"
                "越高代表岗位技能重合度越高，转岗难度相对越低。"
            ),
        },
        "lateral_paths": lateral_paths,
    }


def _salary_delta(difficulty: str) -> str:
    return {"低": "±10%（技能迁移顺畅）",
            "中": "-10%~+5%（需适应期）",
            "高": "-20%~0%（需重新积累经验）"}[difficulty]


# ══════════════════════════════════════════════
# 主流程
# ══════════════════════════════════════════════
def main():
    # ── Step 1：依优先级加载向量数据
    result = None
    source_mode = ""

    if CHROMA_DIR.exists():
        result = _load_from_chromadb_client(CHROMA_DIR)
        if result:
            source_mode = "ChromaDB Client API"

        if result is None:
            result = _load_from_chroma_sqlite(CHROMA_DIR)
            if result:
                source_mode = "ChromaDB SQLite 直读"

    if result is None:
        if not CSV_PATH.exists():
            raise FileNotFoundError(
                f"向量库({CHROMA_DIR})和 CSV({CSV_PATH})均不存在，无法运行。"
            )
        result = _load_from_tfidf(CSV_PATH)
        source_mode = "TF-IDF (jobs_cleaned.csv 兜底)"

    titles, matrix = result
    logger.info("向量数据来源：%s | 岗位数：%d", source_mode, len(titles))

    # ── Step 2：计算相似度矩阵
    logger.info("计算余弦相似度矩阵 %s …", matrix.shape)
    sim_mat = cosine_sim_matrix(matrix)

    # ── Step 3：构建水平路径
    logger.info("构建水平转岗路径（核心岗位 %d 个）…", len(CORE_JOBS))
    output = build_lateral_paths(titles, sim_mat, source_mode)

    # ── Step 4：保存
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info("✅ 完成！共 %d 个核心岗位，已保存 → %s",
                output["meta"]["total_core_jobs"], OUTPUT_JSON)

    # 打印示例
    first_key = next(iter(output["lateral_paths"]))
    first_paths = output["lateral_paths"][first_key]["paths"][:2]
    logger.info("\n示例（%s 的前2条转岗路径）：\n%s",
                first_key, json.dumps(first_paths, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
