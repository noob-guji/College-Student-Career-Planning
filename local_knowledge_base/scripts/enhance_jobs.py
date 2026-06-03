import pandas as pd
import json
import os
import re
import asyncio
import traceback
from openai import AsyncOpenAI
from tqdm.asyncio import tqdm
from collections import Counter

# ================= 配置区域 =================
# DeepSeek API 配置
API_KEY = "deepseek-api-key"
BASE_URL = "https://api.deepseek.com"
MODEL_NAME = "deepseek-chat"

# 文本处理参数
CHUNK_SIZE = 4000
OVERLAP = 500
MAX_CONCURRENCY = 10
MAX_RETRIES = 3

# 初始化异步客户端
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)

# ================= 核心处理函数 (数据准备) =================

def sort_data_by_job_title(input_path, output_path):
    """读取 CSV，按岗位名称排序"""
    try:
        df = pd.read_csv(input_path, encoding="utf-8")
        if '岗位名称' not in df.columns:
            print("❌ 错误：找不到“岗位名称”列。")
            return
        df_sorted = df.sort_values(by='岗位名称', ascending=True, na_position='last')
        df_sorted.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"✅ 排序成功！保存至: {output_path}")
    except Exception as e:
        print(f"❌ 排序失败: {e}")

def aggregate_job_details_to_json(input_path, output_path):
    """按相同岗位名称拼接岗位详情文本，输出为聚合 JSON"""
    try:
        df = pd.read_csv(input_path, encoding="utf-8")
        df['岗位详情'] = df['岗位详情'].fillna('').astype(str)
        grouped = df.groupby('岗位名称')['岗位详情'].apply(lambda x: '\n'.join(x))
        job_dict = grouped.to_dict()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(job_dict, f, ensure_ascii=False, indent=4)
        print(f"✅ 聚合成功！JSON 保存至: {output_path}")
    except Exception as e:
        print(f"❌ 聚合失败: {e}")

def split_json_to_multiple_files(input_path, output_dir):
    """将大 JSON 按岗位名称拆分为多个小 JSON 文件"""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            job_dict = json.load(f)
        os.makedirs(output_dir, exist_ok=True)
        file_count = 0
        for job_title, job_details in job_dict.items():
            safe_filename = re.sub(r'[\\/*?:"<>|]', "_", str(job_title))
            if not safe_filename.strip('_'):
                safe_filename = f"unnamed_job_{file_count}"
            file_path = os.path.join(output_dir, f"{safe_filename}.json")
            with open(file_path, 'w', encoding='utf-8') as out_f:
                json.dump({job_title: job_details}, out_f, ensure_ascii=False, indent=4)
            file_count += 1
        print(f"✅ 拆分成功！生成了 {file_count} 个 JSON 文件于: {output_dir}")
    except Exception as e:
        print(f"❌ 拆分失败: {e}")

# ================= LLM 提取逻辑 (大模型算法) =================

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    """文本切块"""
    chunks, start, text_length = [], 0, len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        if end == text_length: break
        start += chunk_size - overlap
    return chunks

def clean_json_response(response_text):
    """清理 JSON 响应格式"""
    cleaned = response_text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned

async def fetch_chunk_data(chunk, semaphore, pbar_inner):
    """单个 Chunk 的提取任务"""
    system_prompt = """你是一个严谨的信息提取机器人。请从岗位详情片段中提取 JSON 格式：
    {"专业技能": [], "软能力": [], "需要的证书": [], "需要的专业": [], "学历": "", "经验": "", "软技能评分": {"创新能力": 0, "学习能力": 0, "抗压能力": 0, "沟通能力": 0, "实习能力": 0}}
    评分 1-5 分。"""
    async with semaphore:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": chunk}],
                    temperature=0.2,
                )
                json_data = json.loads(clean_json_response(response.choices[0].message.content))
                pbar_inner.update(1)
                return json_data
            except Exception:
                await asyncio.sleep(2 ** attempt)
        pbar_inner.update(1)
        return {"专业技能": [], "软能力": [], "需要的证书": [], "需要的专业": [], "学历": "", "经验": "", "软技能评分": {}}

async def refine_summary(text, field):
    """概括摘要"""
    if not text.strip() or text.strip() == "无" or len(text) < 2: return "不限"
    prompt = f"请概括以下【{field}】描述为一句话（例如：'本科以上学历'）：\n{text}"
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME, messages=[{"role": "user", "content": prompt}], temperature=0.2
        )
        return response.choices[0].message.content.strip()
    except:
        return text[:100]

async def process_job_file(input_file, output_file):
    """单岗位 Map-Reduce 处理核心"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    title = list(data.keys())[0]
    desc = data[title]
    chunks = chunk_text(desc)
    
    with tqdm(total=len(chunks), desc=f"  提取 {title[:10]}", unit="块", leave=False) as pbar:
        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        tasks = [fetch_chunk_data(c, semaphore, pbar) for c in chunks]
        results = await asyncio.gather(*tasks)

    # Reduce 过程
    merged = {
        "专业技能": Counter(), "软能力": Counter(), "证书": Counter(), "专业": Counter(),
        "学历": [], "经验": [], "评分": {"创新能力": [], "学习能力": [], "抗压能力": [], "沟通能力": [], "实习能力": []}
    }
    for res in results:
        merged["专业技能"].update(res.get("专业技能", []))
        merged["软能力"].update(res.get("软能力", []))
        merged["证书"].update(res.get("需要的证书", []))
        merged["专业"].update(res.get("需要的专业", []))
        if res.get("学历") and res.get("学历") != "无": merged["学历"].append(res["学历"])
        if res.get("经验") and res.get("经验") != "无": merged["经验"].append(res["经验"])
        for k, v in res.get("软技能评分", {}).items():
            if isinstance(v, (int, float)) and v > 0: merged["评分"][k].append(v)

    # 汇总
    final = {
        title: {
            "专业技能": [i[0] for i in merged["专业技能"].most_common(20)],
            "软能力": [i[0] for i in merged["软能力"].most_common(10)],
            "需要的证书": [i[0] for i in merged["证书"].most_common(10)],
            "需要的专业": [i[0] for i in merged["专业"].most_common(5)],
            "学历": await refine_summary("\n".join(merged["学历"]), "学历要求"),
            "经验": await refine_summary("\n".join(merged["经验"]), "经验要求"),
            "软技能评分": "，".join([f"{k}{round(sum(v)/len(v)) if v else 1}分" for k, v in merged["评分"].items()])
        }
    }
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

def merge_json_files(input_directory, output_filepath):
    """逻辑：将所有岗位 JSON 合并为一个大型 JSON"""
    merged_data = {}
    success_count = 0
    for filename in os.listdir(input_directory):
        if filename.endswith(".json"):
            file_path = os.path.join(input_directory, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    data = json.load(file)
                    merged_data.update(data)
                    success_count += 1
            except Exception as e:
                print(f"❌ 合并 {filename} 出错: {e}")
    with open(output_filepath, 'w', encoding='utf-8') as outfile:
        json.dump(merged_data, outfile, ensure_ascii=False, indent=4)
    print(f"\n✅ 聚合汇总完成！生成: {output_filepath}")

# ================= 终极自动化流水线 =================

async def run_enhancement_pipeline(input_csv):
    """CSV -> 排序 -> 聚合 -> 拆分 -> LLM提取 -> JSON汇总"""
    base_dir = os.path.dirname(os.path.abspath(input_csv))
    sorted_csv = os.path.join(base_dir, "jobs_sorted.csv")
    agg_json = os.path.join(base_dir, "jobs_aggregated.json")
    split_dir = os.path.join(base_dir, "jobs_individual")
    final_output_dir = os.path.join(base_dir, "jobs_enhanced_results")
    final_grand_json = os.path.join(base_dir, "jobs_enhanced.json")
    
    print("\n🚀 [全自动流水线启动]")
    sort_data_by_job_title(input_csv, sorted_csv)  # Step 1
    aggregate_job_details_to_json(sorted_csv, agg_json)  # Step 2
    split_json_to_multiple_files(agg_json, split_dir)  # Step 3
    
    os.makedirs(final_output_dir, exist_ok=True)
    all_files = [f for f in os.listdir(split_dir) if f.endswith('.json')]
    print(f"\n🧠 [Step 4/5] 并行调用 LLM 提取能力 (共 {len(all_files)} 个岗位)...")
    with tqdm(total=len(all_files), desc="【处理进度】", unit="岗位", colour="green") as pbar:
        for filename in all_files:
            in_p, out_p = os.path.join(split_dir, filename), os.path.join(final_output_dir, f"enhanced_{filename}")
            if not os.path.exists(out_p):
                await process_job_file(in_p, out_p)
            pbar.update(1)
            
    print("\n📦 [Step 5/5] 正在合并汇总 JSON...")
    merge_json_files(final_output_dir, final_grand_json)
    print(f"\n✨ 大功告成！最终结果: {final_grand_json}")

if __name__ == "__main__":
    asyncio.run(run_enhancement_pipeline(r"job_cleaned.csv"))