import json
import sqlite3
from pathlib import Path

# ------------------- 路径 -------------------
DB_PATH = Path(__file__).parent.parent / "database" / "knowledge.db"
JSON_PATH = Path(__file__).parent / "job_portraits_generated.json"

# ------------------- 你的 50 个官方岗位 -------------------
TARGET_JOBS = {
    # 技术开发 20
    "Java开发", "Python开发", "C/C++开发", "前端开发", "后端开发",
    "全栈开发", "Android开发", "iOS开发", "嵌入式开发", "算法工程师",
    "AI/机器学习", "大数据开发", "运维工程师", "信息安全", "网络工程师",
    "硬件工程师", "测试工程师", "Java开发工程师", "前端开发工程师", "软件测试工程师",

    # 产品设计 4
    "产品经理", "UI/UX设计师", "平面设计师", "视觉设计师",

    # 数据与分析 3
    "数据分析师", "BI工程师", "商业分析师",

    # 运营与市场 7
    "运营专员", "市场专员", "品牌专员", "新媒体运营", "内容运营",
    "社区运营", "电商运营",

    # 销售与商务 6
    "销售", "销售经理", "商务拓展", "客户经理", "大客户销售", "广告销售",

    # 职能管理 10
    "HR", "招聘专员", "财务", "会计", "法务",
    "行政", "供应链", "项目经理", "实施工程师", "技术支持工程师"
}

# ------------------- 开始 -------------------
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    portrait_data = json.load(f)

print(f"✅ 加载 {len(portrait_data)} 个AI雷达数据")
print(f"🔒 安全规则：只更新【50个岗位 + company='知名企业'】的假数据\n")

count = 0

for job_title, data in portrait_data.items():
    # 只处理我们 50 个之内的岗位
    if job_title not in TARGET_JOBS:
        print(f"⏭️  不在50名单：{job_title}")
        continue

    dims = data.get("dimensions", {})
    if not dims:
        continue

    def get_dim(key):
        d = dims.get(key, {})
        return (d.get("score", 0), json.dumps(d.get("tags", []), ensure_ascii=False))

    ps_score, ps_tags = get_dim("professional_skills")
    ct_score, ct_tags = get_dim("certificate")
    in_score, in_tags = get_dim("innovation")
    le_score, le_tags = get_dim("learning")
    st_score, st_tags = get_dim("stress_tolerance")
    cm_score, cm_tags = get_dim("communication")
    it_score, it_tags = get_dim("internship")
    ld_score, ld_tags = get_dim("leadership")
    ps_score2, ps_tags2 = get_dim("problem_solving")
    ba_score, ba_tags = get_dim("business_acumen")
    ex_score, ex_tags = get_dim("execution")
    vf_score, vf_tags = get_dim("values_fit")

    portrait_json = json.dumps(data, ensure_ascii=False)

    # ==========================
    # 🔥 最安全的条件
    # 1. 岗位名称匹配
    # 2. 是假数据（company='知名企业'）
    # ==========================
    cur.execute("""
        UPDATE job_portraits SET
            professional_skills_score = ?, professional_skills_tags = ?,
            certificate_score = ?, certificate_tags = ?,
            innovation_score = ?, innovation_tags = ?,
            learning_score = ?, learning_tags = ?,
            stress_score = ?, stress_tags = ?,
            communication_score = ?, communication_tags = ?,
            internship_score = ?, internship_tags = ?,
            leadership_score = ?, leadership_tags = ?,
            problem_solving_score = ?, problem_solving_tags = ?,
            business_acumen_score = ?, business_acumen_tags = ?,
            execution_score = ?, execution_tags = ?,
            values_fit_score = ?, values_fit_tags = ?,
            portrait_json = ?
        WHERE
            job_title = ?
            AND company = '知名企业'  -- 只更新你生成的假数据
    """, (
        ps_score, ps_tags,
        ct_score, ct_tags,
        in_score, in_tags,
        le_score, le_tags,
        st_score, st_tags,
        cm_score, cm_tags,
        it_score, it_tags,
        ld_score, ld_tags,
        ps_score2, ps_tags2,
        ba_score, ba_tags,
        ex_score, ex_tags,
        vf_score, vf_tags,
        portrait_json,
        job_title
    ))

    if cur.rowcount > 0:
        print(f"✅ 更新假数据：{job_title}")
        count += 1
    else:
        print(f"⏭️  跳过（真实数据）：{job_title}")

conn.commit()
conn.close()

print(f"\n🎉 完成！成功更新 {count} 个【假岗位】的AI雷达数据")
print(f"✅ 真实业务数据：100% 完全没动！安全！")