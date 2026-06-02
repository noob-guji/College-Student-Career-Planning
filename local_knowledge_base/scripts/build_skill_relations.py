import json
import sqlite3
from collections import defaultdict
import pandas as pd
import os

# ---------- 0. 统一路径配置----------
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 拼接输入文件绝对路径
json_path = os.path.join(project_root, "data", "processed", "jobs_enhanced.json")
# 拼接数据库绝对路径
db_path = os.path.join(project_root, "database", "knowledge.db")

# ---------- 1. 读取数据 ----------
with open(json_path, encoding='utf-8') as f:
    data = json.load(f)

# ---------- 2. 统计共现 ----------
co_occur = defaultdict(int)

for job_name, job_info in data.items():
    skills = job_info.get("专业技能", [])

    # 去重（避免同一岗位重复计数）
    skills = list(set(skills))

    for i in range(len(skills)):
        for j in range(i + 1, len(skills)):
            pair = tuple(sorted([skills[i], skills[j]]))
            co_occur[pair] += 1

# ---------- 3. 连接数据库 ----------
conn = sqlite3.connect(db_path)

skills_df = pd.read_sql('SELECT skill_id, skill_name FROM skills', conn)
name2id = dict(zip(skills_df['skill_name'], skills_df['skill_id']))

# ---------- 4. 创建关系表 ----------
conn.execute("""
CREATE TABLE IF NOT EXISTS skill_relations (
    skill_id1 INTEGER,
    skill_id2 INTEGER,
    relation_type TEXT,
    weight INTEGER
)
""")

cursor = conn.cursor()

# ---------- 5. 写入 ----------
for (s1, s2), count in co_occur.items():
    if count < 2:  # ⚠️ 你数据不大，建议用2（不是3）
        continue

    id1 = name2id.get(s1)
    id2 = name2id.get(s2)

    if id1 and id2:
        cursor.execute("""
        INSERT INTO skill_relations (skill_id1, skill_id2, relation_type, weight)
        VALUES (?, ?, ?, ?)
        """, (id1, id2, 'related_to', count))

conn.commit()
conn.close()

print("✅ 技能关系构建完成")