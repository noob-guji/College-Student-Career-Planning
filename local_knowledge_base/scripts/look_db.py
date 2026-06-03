import sqlite3
from pathlib import Path

# 数据库路径（自动匹配你的项目）
DB = Path(__file__).parent.parent / "database/knowledge.db"

def show_all_job_portraits():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row  # 可以按字段名读取
    cursor = conn.cursor()

    # 1. 先查总数
    cursor.execute("SELECT COUNT(*) FROM job_portraits")
    total = cursor.fetchone()[0]
    print(f"✅ job_portraits 表总数据量：{total} 条\n")

    # 2. 查询 5 条，**所有字段**，不限制任何列
    cursor.execute("SELECT * FROM job_portraits LIMIT 5")
    rows = cursor.fetchall()

    # 3. 逐条打印完整信息
    for idx, row in enumerate(rows, 1):
        print("=" * 80)
        print(f"📌 第 {idx} 条数据")
        print("=" * 80)
        for key in row.keys():
            print(f"{key:25} = {row[key]}")
        print("\n")

    conn.close()

if __name__ == "__main__":
    show_all_job_portraits()




# import sqlite3
# from pathlib import Path

# DB = Path(__file__).parent.parent / "database/knowledge.db"

# conn = sqlite3.connect(DB)
# cursor = conn.cursor()

# print("=" * 60)
# print("📋 查看 jobs 表的具体内容")
# print("=" * 60)

# # 先看表结构
# cursor.execute("PRAGMA table_info(jobs)")
# cols = cursor.fetchall()
# print("🔹 字段列表：")
# for c in cols:
#     print(f"  - {c[1]}")

# print("=" * 60)
# print("📄 前 10 条真实数据：")
# print("=" * 60)

# # 查询前10条数据
# cursor.execute("SELECT * FROM jobs LIMIT 10")
# rows = cursor.fetchall()

# # 获取列名
# col_names = [desc[0] for desc in cursor.description]

# for idx, row in enumerate(rows, 1):
#     print(f"\n===== 第 {idx} 条 =====")
#     for name, value in zip(col_names, row):
#         print(f"{name:<12} : {value}")

# conn.close()
# print("\n✅ 查看完成！")







# import sqlite3
# from pathlib import Path

# DB = Path(__file__).parent.parent / "database/knowledge.db"

# conn = sqlite3.connect(DB)
# cursor = conn.cursor()

# # 查看所有表
# cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
# tables = cursor.fetchall()

# print("=" * 60)
# print("📦 knowledge.db 数据库全貌（表结构 + 数据量 + 大小）")
# print("=" * 60)

# for table in tables:
#     table_name = table[0]

#     # 跳过系统表
#     if table_name.startswith("sqlite_"):
#         continue

#     print(f"\n🔹 表名: {table_name}")

#     # 字段结构
#     cursor.execute(f"PRAGMA table_info({table_name})")
#     cols = cursor.fetchall()
#     for c in cols:
#         print(f"   ▶ 字段: {c[1]:<15} 类型: {c[2]}")

#     # 数据条数
#     cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
#     count = cursor.fetchone()[0]
#     print(f"   📊 数据条数: {count} 条")

#     # 表占用空间大小
#     cursor.execute(f"""
#         SELECT SUM(pgsize) FROM dbstat WHERE name='{table_name}'
#     """)
#     size_bytes = cursor.fetchone()[0] or 0
#     size_kb = round(size_bytes / 1024, 2)
#     print(f"   📦 占用空间: {size_kb} KB")

# print("\n✅ 全部表信息展示完毕！")
# conn.close()