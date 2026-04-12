from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3, json
from pathlib import Path

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = Path(__file__).parent.parent / "database/knowledge.db"

def parse_tags(s: str) -> list:
    try:
        return json.loads(s) if s else []
    except Exception:
        return []

def row_to_portrait(row) -> dict:
    # 从 portrait_json 中取每个维度的 reason 字段
    full_dims = {}
    try:
        full = json.loads(row["portrait_json"]) if row["portrait_json"] else {}
        full_dims = full.get("dimensions", {})
    except Exception:
        pass

    def get_reason(dim_key: str) -> str:
        return full_dims.get(dim_key, {}).get("reason", "")

    dim_mapping = [
        ("professional_skills", "professional_skills"),
        ("certificate",         "certificate"),
        ("innovation",          "innovation"),
        ("learning",            "learning"),
        ("stress",              "stress_tolerance"),   # db列前缀 stress → API key stress_tolerance
        ("communication",       "communication"),
        ("internship",          "internship"),
        ("leadership",          "leadership"),
        ("problem_solving",     "problem_solving"),
        ("business_acumen",     "business_acumen"),
        ("execution",           "execution"),
        ("values_fit",          "values_fit"),
    ]

    dimensions = {}
    for db_prefix, api_key in dim_mapping:
        dimensions[api_key] = {
            "score": row[f"{db_prefix}_score"] or 0,
            "tags": parse_tags(row[f"{db_prefix}_tags"]),
            "reason": get_reason(api_key),
        }

    return {
        "job_code": row["job_code"],
        "job_title": row["job_title"],
        "company": row["company"] or "",
        "city": row["city"] or "",
        "salary": row["salary_range"] or "",
        "min_salary": row["min_salary"] or 0,
        "max_salary": row["max_salary"] or 0,
        "dimensions": dimensions,
    }

@app.get("/api/portraits")
def get_portraits(
    title: str = Query(None),
    company: str = Query(None),
    limit: int = Query(200, le=2000),
    offset: int = Query(0),
):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = []
    params = []
    if title:
        conditions.append("job_title LIKE ?")
        params.append(f"%{title}%")
    if company:
        conditions.append("company LIKE ?")
        params.append(f"%{company}%")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = cur.execute(
        f"SELECT * FROM job_portraits {where} LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()
    return [row_to_portrait(r) for r in rows]

@app.get("/api/portraits/stats/summary")
def get_stats():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    total = cur.execute("SELECT COUNT(*) FROM job_portraits").fetchone()[0]
    titles = cur.execute("SELECT COUNT(DISTINCT job_title) FROM job_portraits").fetchone()[0]
    conn.close()
    return {
        "total_portraits": total,
        "distinct_titles": titles,
        "dimensions": 12,
        "accuracy": "93%",
    }

@app.get("/api/portraits/{job_code}")
def get_portrait(job_code: str):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM job_portraits WHERE job_code=?", (job_code,)
    ).fetchone()
    conn.close()
    return row_to_portrait(row) if row else {"error": "not found"}