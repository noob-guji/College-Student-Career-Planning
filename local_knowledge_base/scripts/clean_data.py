import os
import pandas as pd
import numpy as np
import re
import asyncio
import json
from openai import AsyncOpenAI
from tqdm.asyncio import tqdm




def clean_job_details(df):
    """逻辑：清洗“岗位详情”中的 HTML 标签并返回 df"""
    if '岗位详情' not in df.columns:
        print("警告：未找到“岗位详情”列，跳过 HTML 清洗。")
        return df
    
    print("开始清洗“岗位详情” HTML 标签...")
    df['岗位详情'] = df['岗位详情'].fillna('').astype(str)
    df['岗位详情'] = df['岗位详情'].apply(lambda x: re.sub(r'<[^>]+>', '', x))
    return df


def deduplicate_data(df):
    """逻辑：多字段完全一致进行去重并返回 df"""
    subset_cols = ['岗位名称', '地址', '公司名称', '岗位详情']
    missing_cols = [col for col in subset_cols if col not in df.columns]
    
    if missing_cols:
        print(f"警告：缺少以下列，无法执行去重: {missing_cols}")
        return df
    
    before = len(df)
    df = df.drop_duplicates(subset=subset_cols, keep='first')
    print(f"去重完成，移除了 {before - len(df)} 行重复数据。")
    return df


def filter_job_details(df):
    """逻辑：基于“岗位详情”字段长度过滤数据并返回 df"""
    if '岗位详情' not in df.columns:
        print("警告：缺少“岗位详情”列，无法执行长度过滤。")
        return df
    
    before = len(df)
    # 计算长度并过滤（仅保留长度 >= 8 的详情）
    df = df[df['岗位详情'].fillna('').astype(str).apply(len) >= 8].copy()
    print(f"长度过滤完成，移除了 {before - len(df)} 行数据（详情过短）。")
    return df


def process_salary_data(df):
    """逻辑：解析“薪资范围”列并返回带有新字段的 df"""
    def parse_salary(salary_str):
        if pd.isna(salary_str) or '面议' in str(salary_str) or '0-0' in str(salary_str):
            return np.nan, np.nan, 12
        min_sal, max_sal, months = np.nan, np.nan, 12
        salary_str = str(salary_str).replace(' ', '')
        # 1. 提取多薪
        month_match = re.search(r'[·\-]?(\d{2})薪', salary_str)
        if month_match: months = int(month_match.group(1))
        # 2. 日薪
        daily_match = re.search(r'(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?).*?[天日]', salary_str)
        if daily_match:
            return float(daily_match.group(1)) * 21.75, float(daily_match.group(2)) * 21.75, months
        # 3. 千(k) 级
        k_match = re.search(r'(\d+(?:\.\d+)?)k?-(\d+(?:\.\d+)?)k', salary_str, re.IGNORECASE)
        if k_match: return float(k_match.group(1)) * 1000, float(k_match.group(2)) * 1000, months
        # 4. 万 级
        wan_match = re.search(r'(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)万', salary_str)
        if wan_match:
            min_s, max_s = float(wan_match.group(1)) * 10000, float(wan_match.group(2)) * 10000
            if '年' in salary_str: min_s /= months; max_s /= months
            return min_s, max_s, months
        # 5. 绝对数值
        num_match = re.search(r'(\d+)-(\d+)元', salary_str)
        if num_match: return float(num_match.group(1)), float(num_match.group(2)), months
        return min_sal, max_sal, months

    if '薪资范围' in df.columns:
        print("开始解析薪资数据...")
        parsed = df['薪资范围'].apply(parse_salary)
        df[['min_salary', 'max_salary', 'salary_months']] = pd.DataFrame(parsed.tolist(), index=df.index)
    else:
        print("警告：未找到“薪资范围”列，跳过薪资解析。")
    return df


# ================= LLM 配置与 Prompt =================
DEEPSEEK_API_KEY = "deepseek-api-key"

client = AsyncOpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

CLEAN_SYSTEM_PROMPT = """你是一个数据清洗工具。请严格去除输入岗位名称中的：
1. 招聘黑话/福利（薪资、双休、包吃住等）
2. 公司/平台前缀（腾讯、字节跳动等）
3. 地域前缀（北京、朝阳区等）
4. 一人分饰两角/复合岗位（仅保留最核心的单一职位）"""

STANDARDIZE_SYSTEM_PROMPT = """你是一个人力资源专家。请尽力将输入岗位映射至给定的标准库。
若标准库无合理对应，才允许生成新岗位。
严格按以下 JSON 结构输出：{"track": "CLASSIFICATION" 或 "DISCOVERY", "standard_job": "匹配项或null", "suggested_new_job": "新岗位名或null"}"""


# ================= LLM 逻辑 =================

async def llm_clean_job_titles(df):
    """逻辑：使用 LLM 清洗岗位名称并返回 df"""
    print("🚀 开始 LLM 岗位名称预清洗...")
    titles = df["岗位名称"].fillna("未提供").astype(str).tolist()
    batch_size = 10
    semaphore = asyncio.Semaphore(10)
    batches = [titles[i:i + batch_size] for i in range(0, len(titles), batch_size)]

    async def batch_task(batch_data, b_idx):
        async with semaphore:
            try:
                response = await client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{"role": "system", "content": CLEAN_SYSTEM_PROMPT}, {"role": "user", "content": "\n".join(batch_data)}],
                    temperature=0.1, max_tokens=200
                )
                res = [line.strip() for line in response.choices[0].message.content.strip().split('\n') if line.strip()]
                return (res + ["清洗失败"] * len(batch_data))[:len(batch_data)]
            except:
                return batch_data

    tasks = [batch_task(batch, i) for i, batch in enumerate(batches)]
    results = await tqdm.gather(*tasks, desc="🧠 清洗进度")
    df["岗位名称"] = [t for batch in results for t in batch]
    return df


async def llm_standardize_job_titles(df, standards_json_path):
    """逻辑：使用 LLM 标准化映射岗位名称并返回 df"""
    print("🚀 开始 LLM 岗位名称标准化映射...")
    if not os.path.exists(standards_json_path):
        print(f"❌ 警告：未找到标准库 JSON ({standards_json_path})。")
        return df

    with open(standards_json_path, 'r', encoding='utf-8') as f:
        standards_str = "|".join(json.load(f))

    unique_jobs = df['岗位名称'].dropna().unique().tolist()
    semaphore = asyncio.Semaphore(15)

    async def job_task(job):
        async with semaphore:
            try:
                response = await client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{"role": "system", "content": STANDARDIZE_SYSTEM_PROMPT}, {"role": "user", "content": f"标准库:{standards_str}\n岗位:{job}"}],
                    response_format={"type": "json_object"}, temperature=0.1
                )
                res = json.loads(response.choices[0].message.content)
                new_val = res.get("standard_job") if res.get("track") == "CLASSIFICATION" else f"666{res.get('suggested_new_job')}"
                return job, new_val
            except:
                return job, job

    tasks = [job_task(job) for job in unique_jobs]
    mapping = dict(await tqdm.gather(*tasks, desc="🌍 映射进度"))
    df['岗位名称'] = df['岗位名称'].apply(lambda x: mapping.get(x, x))
    return df


async def run_data_cleaning_pipeline(initial_input):
    """
    终极极简流水线：初始 CSV -> 内存清洗 -> 输出 job_cleaned.csv
    不产生中间文件，全程在内存中完成。
    """
    if not os.path.exists(initial_input):
        print(f"❌ 错误：找不到初始文件 {initial_input}")
        return

    print(f"📢 初始数据集加载: {initial_input}")
    output_path = "job_cleaned.csv"
    standards_json = r"D:\DeskTop\服务外包知识库\local_knowledge_base\data\raw\a13-JD采样数据岗位名称.json"

    try:
        # 加载初始数据
        df = pd.read_csv(initial_input)
        
        # 🟢 执行流水线 (内存内存)
        df = clean_job_details(df)
        df = deduplicate_data(df)
        df = filter_job_details(df)
        df = process_salary_data(df)
        
        # 🟡 执行 LLM (内存内存)
        df = await llm_clean_job_titles(df)
        df = await llm_standardize_job_titles(df, standards_json)

        # 🔴 过滤逻辑：剔除所有标记为新岗位（包含 666）的数据
        before_final = len(df)
        df = df[~df['岗位名称'].str.contains('666', na=False)].copy()
        removed_count = before_final - len(df)
        
        # 保存唯一结果
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"\n✨ 全部处理完成！")
        print(f"🚫 已剔除未对齐标准库的“发现类”岗位（含666）: {removed_count} 行")
        print(f"📂 最终清洗后的单一文件已保存至: {os.path.abspath(output_path)}")

    except Exception as e:
        print(f"❌ 运行异常: {e}")


if __name__ == "__main__":
    # 配置你的初始 CSV 路径
    INPUT_PATH = r"jobs_data.csv" 
    
    # 启动异步流水线
    asyncio.run(run_data_cleaning_pipeline(INPUT_PATH))
