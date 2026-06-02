import json, os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# 加载现有数据
VERTICAL_PATH = Path(__file__).parent.parent.parent / "data" / "knowledge_graph" / "vertical_paths.json"
LATERAL_PATH = Path(__file__).parent.parent.parent / "data" / "knowledge_graph" / "lateral_paths.json"

with open(VERTICAL_PATH, 'r', encoding='utf-8') as f:
    vertical_data = json.load(f)

with open(LATERAL_PATH, 'r', encoding='utf-8') as f:
    lateral_data = json.load(f)

# 获取已有转岗路径的岗位
existing_lateral_jobs = set(lateral_data['lateral_paths'].keys())
print(f"已有转岗路径的岗位: {len(existing_lateral_jobs)}个")

# 获取所有岗位类别
all_categories = set(vertical_data['category_paths'].keys())
print(f"总岗位类别: {len(all_categories)}个")

# 需要补充转岗路径的岗位
jobs_to_generate = all_categories - existing_lateral_jobs
print(f"需要生成转岗路径的岗位: {len(jobs_to_generate)}个")
print("岗位列表:", list(jobs_to_generate))

# DeepSeek客户端
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1",
)

def generate_lateral_paths(job_title):
    """为岗位生成转岗路径"""

    prompt = f"""你是一个资深职业规划专家，请为"{job_title}"岗位生成合理的转岗路径。

基于当前行业水平、招聘标准、职业发展规律，生成3-5个转岗建议。

每个转岗路径包含：
- 目标岗位：具体的岗位名称
- 相似度得分：0.0-1.0之间的数值，表示技能重合度
- 难度：低/中/高
- 所需补充技能：数组，列出需要学习的技能
- 预计过渡周期：时间范围，如"3-6个月"
- 推荐行动：具体建议
- 薪资变化参考：如"+10%"或"-5%~+5%"

请确保转岗路径合理、具体，避免泛泛而谈。

输出格式：严格JSON格式
{{
  "source_job": "{job_title}",
  "paths": [
    {{
      "目标岗位": "具体岗位名",
      "相似度得分": 0.75,
      "难度": "中",
      "所需补充技能": ["技能1", "技能2"],
      "预计过渡周期": "6-12个月",
      "推荐行动": "具体行动建议",
      "薪资变化参考": "+5%~+15%"
    }}
  ]
}}"""

    try:
        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}]
        )

        raw = completion.choices[0].message.content
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)

        # 验证结果
        if "paths" not in result or len(result["paths"]) == 0:
            raise ValueError("Invalid lateral paths")

        # 限制为5个路径
        result["paths"] = result["paths"][:5]

        return result

    except Exception as e:
        print(f"生成 {job_title} 转岗路径失败: {e}")
        return None

# 生成转岗路径
new_lateral_paths = {}

for job in jobs_to_generate:
    print(f"正在生成转岗路径: {job}")
    lateral = generate_lateral_paths(job)
    if lateral:
        new_lateral_paths[job] = lateral
        print(f"✓ {job} 完成")
    else:
        print(f"✗ {job} 失败")

# 合并到现有数据
lateral_data['lateral_paths'].update(new_lateral_paths)
lateral_data['meta']['total_core_jobs'] = len(lateral_data['lateral_paths'])

# 保存更新后的数据
with open(LATERAL_PATH, 'w', encoding='utf-8') as f:
    json.dump(lateral_data, f, ensure_ascii=False, indent=2)

print(f"\n转岗路径生成完成! 新增 {len(new_lateral_paths)} 个岗位的转岗路径")
print(f"总转岗路径岗位数: {lateral_data['meta']['total_core_jobs']}个")