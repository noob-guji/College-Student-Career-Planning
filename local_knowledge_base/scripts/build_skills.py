import json
import pandas as pd
import sqlite3  # 操作轻量级数据库SQLite
import os
import re

# ---------- 1. 读取数据 ----------
# 项目根目录 = 脚本目录的上级（scripts → local_knowledge_base）
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 拼接目标文件路径
file_path = os.path.join(project_root, "data", "processed", "jobs_enhanced.json")

with open(file_path, encoding='utf-8') as f:
    data = json.load(f)

# ---------- 2. 技能收集 ----------
skills = set()

for job_name, job_info in data.items():
    for skill in job_info.get("专业技能", []):
        skill = skill.strip()
        if skill:
            skills.add(skill)

# ---------- 3. 简单标准化（推荐加！） ----------
def normalize(skill):
    skill = skill.lower()
    skill = skill.replace(" ", "")
    return skill

normalized_map = {}
for s in skills:
    key = normalize(s)
    normalized_map[key] = s  # 保留一个标准写法

final_skills = list(normalized_map.values())

# ---------- 4. 转 DataFrame ----------
skills_df = pd.DataFrame(final_skills, columns=['skill_name'])
skills_df['skill_id'] = range(1, len(skills_df) + 1)

# ---------- 5. 保存 CSV ----------
csv_path = os.path.join(project_root, "data", "processed", "skills_master.csv")
skills_df.to_csv(csv_path, index=False, encoding='utf-8-sig')

# ---------- 6. 写入 SQLite ----------
db_path = os.path.join(project_root, "database", "knowledge.db")
conn = sqlite3.connect(db_path)

# 建表（建议加上）
conn.execute("""
CREATE TABLE IF NOT EXISTS skills (
    skill_id INTEGER PRIMARY KEY,
    skill_name TEXT UNIQUE
)
""")

skills_df.to_sql('skills', conn, if_exists='replace', index=False)

conn.close()

print(f"✅ 技能库构建完成，共 {len(skills_df)} 个技能")