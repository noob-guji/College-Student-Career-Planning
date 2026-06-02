import json
import sqlite3
from pathlib import Path

# 路径
DB_PATH = Path(__file__).parent.parent / "database" / "knowledge.db"
JSON_PATH = Path(__file__).parent / "job_portraits_generated.json"

# 加载刚生成的真实数据
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    generated = json.load(f)

# 你要更新的 46 个岗位（ exactly 你提供的列表）
TARGET_JOBS = {
    'Java开发', 'Python开发', 'C/C++开发', '前端开发', '后端开发',
    '全栈开发', 'Android开发', 'iOS开发', '嵌入式开发',
    '算法工程师', 'AI/机器学习', '大数据开发', '运维工程师',
    '信息安全', '网络工程师', '硬件工程师', '测试工程师',
    '实施工程师', '技术支持工程师', '产品经理', 'UI/UX设计师',
    '平面设计师', '视觉设计师', '数据分析师', 'BI工程师',
    '商业分析师', '运营专员', '市场专员', '品牌专员',
    '新媒体运营', '内容运营', '社区运营', '电商运营',
    '销售', '商务拓展', '客户经理', '大客户销售', '广告销售',
    'HR', '招聘专员', '财务', '会计', '法务', '行政',
    '供应链', '项目经理'
}

# 连接数据库
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
count = 0

for job_title in TARGET_JOBS:
    if job_title not in generated:
        continue

    portrait = generated[job_title]
    dims = portrait.get("dimensions", {})
    if not dims:
        continue

    # 构建要更新的 12 个维度（只更新这些字段）
    update_fields = []
    params = []

    dim_mapping = {
        "professional_skills": "professional_skills",
        "certificate": "certificate",
        "innovation": "innovation",
        "learning": "learning",
        "stress_tolerance": "stress",
        "communication": "communication",
        "internship": "internship",
        "leadership": "leadership",
        "problem_solving": "problem_solving",
        "business_acumen": "business_acumen",
        "execution": "execution",
        "values_fit": "values_fit",
    }

    for dim_key, db_col in dim_mapping.items():
        if dim_key in dims:
            score = dims[dim_key].get("score", 0)
            tags = json.dumps(dims[dim_key].get("tags", []), ensure_ascii=False)
            update_fields.append(f"{db_col}_score = ?")
            update_fields.append(f"{db_col}_tags = ?")
            params.append(score)
            params.append(tags)

    # 完整JSON画像
    portrait_json = json.dumps(portrait, ensure_ascii=False)
    update_fields.append("portrait_json = ?")
    params.append(portrait_json)

    # WHERE 条件：只更新这个岗位
    params.append(job_title)

    # 执行 UPDATE（只改这一行！）
    sql = f"""
        UPDATE job_portraits
        SET {', '.join(update_fields)}
        WHERE job_title = ?
    """
    cur.execute(sql, params)
    count += 1
    print(f"✅ 已更新：{job_title}")

conn.commit()
conn.close()

print(f"\n🎉 全部完成！成功更新 {count} 个岗位的 12 维真实画像！")