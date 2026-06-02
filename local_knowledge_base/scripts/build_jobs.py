import sqlite3
import pandas as pd
import json
import os
import re

# ================= 1. 路径配置 =================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'jobs_cleaned.csv')
JSON_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'jobs_enhanced.json')
DB_PATH = os.path.join(BASE_DIR, 'database', 'knowledge.db')

def init_database():
    # 确保目录存在
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # 清理旧库
    if os.path.exists(DB_PATH):
        try: os.remove(DB_PATH)
        except: pass

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print("🔗 正在构建数据库 (精准对齐 JSON 维度模式)...")

    # --- 2. 创建 jobs 表 (CSV 原始数据) ---
    cursor.execute('''CREATE TABLE jobs (
        岗位编码 TEXT, 岗位名称 TEXT, 公司名称 TEXT, 地址 TEXT, 
        薪资范围 TEXT, 岗位详情 TEXT, min_salary INTEGER, max_salary INTEGER
    )''')

    # --- 3. 创建 job_profiles 表 (严格对应 JSON 的四个维度) ---
    # 包含：专业技能、软能力、证书、以及五个打分项
    cursor.execute('''CREATE TABLE job_profiles (
        profile_name TEXT PRIMARY KEY,
        professional_skills TEXT,
        soft_skills TEXT,
        certifications TEXT,
        innovation INTEGER,
        learning INTEGER,
        stress INTEGER,
        communication INTEGER,
        internship INTEGER
    )''')

    # --- 4. 插入 CSV 数据 ---
    print("📥 正在从 CSV 导入 jobs 表...")
    df_raw = pd.read_csv(CSV_PATH)
    valid_cols = ['岗位编码', '岗位名称', '公司名称', '地址', '薪资范围', '岗位详情', 'min_salary', 'max_salary']
    df_jobs = df_raw[[c for c in valid_cols if c in df_raw.columns]]
    df_jobs.to_sql('jobs', conn, if_exists='append', index=False)
    print(f"✅ jobs 导入完成，共 {len(df_jobs)} 条。")

    # --- 5. 插入 JSON 数据 (补全“软能力”并原样存储) ---
    print("📥 正在从 JSON 导入 job_profiles 表...")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        enhanced_data = json.load(f)

    for name, info in enhanced_data.items():
        # 提取五个能力打分 (正则匹配数字)
        score_text = info.get("软技能评分（1-5分）", "")
        scores = re.findall(r'\d', score_text)
        # 确保有5个分值，不足补3
        s = [int(x) for x in scores]
        while len(s) < 5: s.append(3)

        # 执行插入：原封不动存入 专业技能、软能力、证书
        cursor.execute('''
            INSERT INTO job_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name,
            json.dumps(info.get("专业技能", []), ensure_ascii=False), # 专业技能
            json.dumps(info.get("软能力", []), ensure_ascii=False),   # 补上的软能力
            json.dumps(info.get("需要的证书", []), ensure_ascii=False), # 需要的证书
            s[0], s[1], s[2], s[3], s[4] # 五个打分
        ))

    conn.commit()
    conn.close()
    print("-" * 30)
    print(f"✨ 数据库构建成功！已补全“软能力”字段并同步所有 JSON 维度。")

if __name__ == "__main__":
    init_database()