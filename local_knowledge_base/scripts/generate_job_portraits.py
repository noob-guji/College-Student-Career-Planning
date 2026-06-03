import json
import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ------------------- 配置（文件名完全不变！） -------------------
BASE_DIR = Path(__file__).parent.parent
FILE = BASE_DIR / "scripts" / "job_portraits_generated.json"

# ------------------- 50 个固定岗位 -------------------
TARGET_JOBS = [
    # 技术开发 20
    "Java开发", "Python开发", "C/C++开发", "前端开发", "后端开发",
    "全栈开发", "Android开发", "iOS开发", "嵌入式开发", "算法工程师",
    "AI/机器学习", "大数据开发", "运维工程师", "信息安全", "网络工程师",
    "硬件工程师", "测试工程师",
    "Java开发工程师", "前端开发工程师", "软件测试工程师",

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
]

# ------------------- 岗位描述 -------------------
JOB_DESC = {
    "Java开发": "Java后端、微服务、高并发、分布式系统",
    "Python开发": "Python后端、数据处理、AI应用、自动化脚本",
    "C/C++开发": "系统底层、高性能计算、嵌入式、架构优化",
    "前端开发": "Web前端、React/Vue、工程化、交互体验",
    "后端开发": "服务端架构、API设计、数据库、性能调优",
    "全栈开发": "前后端一体化、技术选型、部署上线",
    "Android开发": "Android应用、Kotlin、性能优化",
    "iOS开发": "iOS应用、Swift、苹果生态开发",
    "嵌入式开发": "嵌入式系统、固件、硬件驱动",
    "算法工程师": "机器学习、深度学习、模型训练",
    "AI/机器学习": "大模型、神经网络、CV/NLP",
    "大数据开发": "Hadoop/Spark、数仓、实时计算",
    "运维工程师": "服务器、自动化部署、监控告警",
    "信息安全": "网络安全、渗透测试、安全加固",
    "网络工程师": "网络架构、路由交换、网络优化",
    "硬件工程师": "硬件设计、电路、PCB、原型验证",
    "测试工程师": "软件测试、自动化测试、质量保障",
    "Java开发工程师": "Java后端开发、SpringBoot、微服务、高并发项目",
    "前端开发工程师": "Web前端开发、React、Vue、工程化、交互体验",
    "软件测试工程师": "功能测试、自动化测试、接口测试、质量保障",

    "产品经理": "需求分析、产品规划、原型、项目推进",
    "UI/UX设计师": "界面设计、交互体验、用户研究",
    "平面设计师": "品牌视觉、广告、平面创意",
    "视觉设计师": "视觉体系、动效、品牌视觉",

    "数据分析师": "数据清洗、可视化、业务洞察",
    "BI工程师": "数据建模、BI报表、数据仓库",
    "商业分析师": "市场分析、商业策略、竞争分析",

    "运营专员": "用户增长、活动策划、内容运营",
    "市场专员": "市场推广、品牌宣传、渠道拓展",
    "品牌专员": "品牌管理、传播、品牌活动",
    "新媒体运营": "公众号/抖音/小红书内容运营",
    "内容运营": "内容策划、生产、分发、效果跟踪",
    "社区运营": "社群运营、用户活跃、内容管理",
    "电商运营": "店铺运营、商品管理、活动促销",

    "销售": "客户开发、谈判、业绩达成",
    "销售经理": "销售团队管理、客户开发、业绩目标",
    "商务拓展": "渠道合作、商务谈判、市场拓展",
    "客户经理": "客户关系、需求对接、长期维护",
    "大客户销售": "企业级客户、解决方案销售",
    "广告销售": "广告资源销售、客户开发",

    "HR": "招聘、薪酬、员工关系、组织发展",
    "招聘专员": "简历筛选、面试、人才寻访",
    "财务": "账务、预算、成本、财务分析",
    "会计": "记账、报税、审计、凭证管理",
    "法务": "合同审核、合规、知识产权、风险控制",
    "行政": "办公管理、后勤、采购、会务",
    "供应链": "采购、仓储、物流、供应商管理",
    "项目经理": "项目计划、进度、风险、团队管理",
    "实施工程师": "项目实施、系统部署、客户对接",
    "技术支持工程师": "技术售后、问题排查、客户服务"
}

# ------------------- Prompt -------------------
PROMPT = """
你是资深职业规划专家。
严格按照岗位，生成**差异化明显**的12维能力画像，每个岗位风格要不一样。
必须输出完整12个维度，**不能缺任何一个**。

【12个维度】
- professional_skills：专业技能
- certificate：证书要求
- innovation：创新能力
- learning：学习能力
- stress_tolerance：抗压能力
- communication：沟通能力
- internship：实习经历
- leadership：领导力
- problem_solving：问题解决能力
- business_acumen：商业敏感度
- execution：执行力
- values_fit：价值观匹配

输出格式（严格JSON，无任何多余内容）：
{{
  "dimensions": {{
    "professional_skills": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "certificate": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "innovation": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "learning": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "stress_tolerance": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "communication": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "internship": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "leadership": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "problem_solving": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "business_acumen": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "execution": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }},
    "values_fit": {{ "score": 0-100, "tags": ["3-4个"], "reason": "15字左右" }}
  }}
}}

【岗位】{job}
【描述】{desc}
"""

# ------------------- AI -------------------
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1",
)

def generate_dimensions(job):
    prompt = PROMPT.format(job=job, desc=JOB_DESC[job])
    try:
        resp = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        txt = resp.choices[0].message.content.strip()
        txt = txt.replace("```json", "").replace("```", "").strip()
        return json.loads(txt)
    except Exception as e:
        print(f"❌ {job} 生成失败：{str(e)}")
        return None

# ------------------- 加载并全部重新生成 -------------------
with open(FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

total = len(TARGET_JOBS)
count = 0

print(f"🚀 开始重新生成 50 个岗位 12 维数据（文件名不变，前端不受影响）\n")

for job in TARGET_JOBS:
    count += 1
    print(f"[{count}/{total}] 刷新：{job}")

    new_data = generate_dimensions(job)
    if new_data and "dimensions" in new_data:
        data[job] = new_data
        print(f"✅ 完成\n")
    else:
        print(f"⚠️  生成失败，保留原有数据\n")

# ------------------- 保存（覆盖原文件，文件名不变） -------------------
with open(FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n🎉 全部完成！50 个岗位 12 维数据已全部重新生成！")
print(f"📁 文件名不变：{FILE}")
print(f"✅ 前端不需要任何修改！")