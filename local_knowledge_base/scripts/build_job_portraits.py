import json, re, sqlite3, os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

BASE = Path(__file__).parent.parent
PROMPT = (BASE / "config/prompt_templates/job_portrait_extraction.txt").read_text(encoding="utf-8")
DB = BASE / "database/knowledge.db"

# # ========================
# # 通义千问客户端
# # ========================
# client = OpenAI(
#     api_key=os.getenv("DASHSCOPE_API_KEY"),
#     base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
# )

# ========================
# DeepSeek 客户端
# ========================
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1",
)

# ── 规则引擎后处理 ────────────────────────────────
def rule_engine_boost(jd: str, llm_result: dict) -> dict:
    dims = llm_result["dimensions"]
    rule_map = {
        "certificate":      ["证书", "持证", "CPA", "CFA", "PMP", "计算机等级", "英语四六级", "资格证"],
        "internship":       ["实习", "实习经历", "实践经验", "校外经验", "实训"],
        "leadership":       ["团队管理", "带团队", "Leader", "管理经验", "负责人", "统筹"],
        "stress_tolerance": ["加班", "抗压", "高强度", "快节奏", "压力", "deadline"],
        "innovation":       ["创新", "创意", "突破", "探索", "研究能力", "优化"],
        "problem_solving":  ["解决问题", "故障排查", "分析能力", "攻坚", "独立思考"],
        "business_acumen":  ["商业", "市场", "客户", "营收", "业务", "商务"],
        "execution":        ["执行", "落地", "推进", "按时交付", "目标完成", "结果导向"],
        "values_fit":       ["价值观", "文化认同", "诚信", "责任心", "敬业", "团队精神"],
    }
    for dim_key, keywords in rule_map.items():
        hit_count = sum(1 for kw in keywords if kw.lower() in jd.lower())
        if hit_count >= 2 and dims[dim_key]["score"] < 50:
            dims[dim_key]["score"] = min(dims[dim_key]["score"] + 20, 85)
            matched = [kw for kw in keywords if kw in jd][:2]
            dims[dim_key]["tags"] = list(set(dims[dim_key].get("tags", []) + matched))
    return llm_result

# ── 单条JD提取 ────────────────────────────
def extract_portrait(jd: str) -> dict:
    prompt = PROMPT.replace("{job_description}", jd[:3000])

      # # 通义千问调用
    # completion = client.chat.completions.create(
    #     model="qwen-plus",
    #     messages=[{"role": "user", "content": prompt}]
    # )

    completion = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}]
    )

    raw = completion.choices[0].message.content
    raw = re.sub(r"```json|```", "", raw).strip()
    result = json.loads(raw)
    return rule_engine_boost(jd, result)

# ── 初始化 job_portraits 表 ─────────────────────────────
def init_portraits_table(conn):
    # 如果job_portraits表存在就先删除，再重建！
    # 非必要情况下，不要用这行删除数据的代码！会重新处理之前的JD，浪费API调用额度！
    # conn.execute("DROP TABLE IF EXISTS job_portraits")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS job_portraits (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            job_code                TEXT UNIQUE,
            job_title               TEXT,
            company                 TEXT,
            city                    TEXT,
            salary_range            TEXT,
            min_salary              INTEGER,
            max_salary              INTEGER,
            professional_skills_score INTEGER,
            professional_skills_tags  TEXT,
            certificate_score       INTEGER,
            certificate_tags        TEXT,
            innovation_score        INTEGER,
            innovation_tags         TEXT,
            learning_score          INTEGER,
            learning_tags           TEXT,
            stress_score            INTEGER,
            stress_tags             TEXT,
            communication_score     INTEGER,
            communication_tags      TEXT,
            internship_score        INTEGER,
            internship_tags         TEXT,
            leadership_score        INTEGER,
            leadership_tags         TEXT,
            problem_solving_score   INTEGER,
            problem_solving_tags    TEXT,
            business_acumen_score   INTEGER,
            business_acumen_tags    TEXT,
            execution_score         INTEGER,
            execution_tags          TEXT,
            values_fit_score        INTEGER,
            values_fit_tags         TEXT,
            portrait_json           TEXT,
            created_at              DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

# ── 批量处理──────────────────────────────
def build_portraits_batch(limit=100):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    init_portraits_table(conn)
    cur = conn.cursor()

    rows = cur.execute("""
        SELECT 岗位编码, 岗位名称, 公司名称, 地址, 薪资范围, 岗位详情, min_salary, max_salary
        FROM jobs
        LIMIT ?
    """, (limit,)).fetchall()

    success, fail = 0, 0
    for row in rows:
        job_code    = row["岗位编码"]
        job_title   = row["岗位名称"]
        company     = row["公司名称"]
        city        = row["地址"] or ""
        salary_range= row["薪资范围"] or ""
        min_sal     = row["min_salary"] or 0
        max_sal     = row["max_salary"] or 0
        jd          = row["岗位详情"] or ""

        if not jd.strip():
            continue

        exists = cur.execute("SELECT 1 FROM job_portraits WHERE job_code=?", (job_code,)).fetchone()
        if exists:
            continue

        try:
            portrait = extract_portrait(jd)
            d = portrait["dimensions"]

            cur.execute("""
                INSERT INTO job_portraits (
                    job_code, job_title, company, city, salary_range, min_salary, max_salary,
                    professional_skills_score, professional_skills_tags,
                    certificate_score,         certificate_tags,
                    innovation_score,          innovation_tags,
                    learning_score,            learning_tags,
                    stress_score,              stress_tags,
                    communication_score,       communication_tags,
                    internship_score,          internship_tags,
                    leadership_score,          leadership_tags,
                    problem_solving_score,     problem_solving_tags,
                    business_acumen_score,     business_acumen_tags,
                    execution_score,           execution_tags,
                    values_fit_score,          values_fit_tags,
                    portrait_json
                ) VALUES (
                    ?,?,?,?,?,?,?,
                    ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?,
                    ?
                )
            """, (
                job_code, job_title, company, city, salary_range, min_sal, max_sal,
                d["professional_skills"]["score"],
                json.dumps(d["professional_skills"].get("tags", []), ensure_ascii=False),
                d["certificate"]["score"],
                json.dumps(d["certificate"].get("tags", []), ensure_ascii=False),
                d["innovation"]["score"],
                json.dumps(d["innovation"].get("tags", []), ensure_ascii=False),
                d["learning"]["score"],
                json.dumps(d["learning"].get("tags", []), ensure_ascii=False),
                d["stress_tolerance"]["score"],
                json.dumps(d["stress_tolerance"].get("tags", []), ensure_ascii=False),
                d["communication"]["score"],
                json.dumps(d["communication"].get("tags", []), ensure_ascii=False),
                d["internship"]["score"],
                json.dumps(d["internship"].get("tags", []), ensure_ascii=False),
                d["leadership"]["score"],
                json.dumps(d["leadership"].get("tags", []), ensure_ascii=False),
                d["problem_solving"]["score"],
                json.dumps(d["problem_solving"].get("tags", []), ensure_ascii=False),
                d["business_acumen"]["score"],
                json.dumps(d["business_acumen"].get("tags", []), ensure_ascii=False),
                d["execution"]["score"],
                json.dumps(d["execution"].get("tags", []), ensure_ascii=False),
                d["values_fit"]["score"],
                json.dumps(d["values_fit"].get("tags", []), ensure_ascii=False),
                json.dumps(portrait, ensure_ascii=False),
            ))
            conn.commit()
            success += 1
            if success % 10 == 0:
                print(f"✅ 已处理 {success} 条")

        except Exception as e:
            fail += 1
            print(f"❌ 失败 [{job_title}]: {e}")

    conn.close()
    print(f"\n完成！成功: {success} 条，失败: {fail} 条")

if __name__ == "__main__":
    build_portraits_batch(limit=10500) # 处理前10500条数据，剩余的可以后续再处理，避免一次性调用过多API导致失败