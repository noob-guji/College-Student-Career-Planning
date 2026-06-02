import pandas as pd
import json
import os
import torch
from sentence_transformers import SentenceTransformer
import chromadb
from tqdm import tqdm

# ================= 1. 配置路径 =================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'jobs_cleaned.csv')
JSON_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'jobs_enhanced.json')
VECTOR_DB_PATH = os.path.join(BASE_DIR, 'vector_db', 'chroma')
MODEL_NAME = 'BAAI/bge-base-zh-v1.5' 

def build_vector_db():
    # 2. 初始化环境
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🚀 运行设备: {device.upper()} | 模型: {MODEL_NAME}")

    model = SentenceTransformer(MODEL_NAME, device=device)
    client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
    
    try:
        client.delete_collection("jobs")
        print("🧹 已清理旧数据...")
    except:
        pass
    collection = client.get_or_create_collection(name="jobs", metadata={"hnsw:space": "cosine"})

    # 3. 数据处理
    df = pd.read_csv(CSV_PATH)
    if '序号' not in df.columns:
        df.insert(0, '序号', range(1, len(df) + 1))
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        enhanced_data = json.load(f)

    all_texts, all_metadatas, all_ids = [], [], []

    print("🛠️ 正在构建 768 维向量块 (已移除岗位编码)...")
    for row in df.itertuples(index=False):
        idx_val = str(row.序号)
        title = str(row.岗位名称)
        industry = str(getattr(row, '所属行业', '未知'))
        detail = str(row.岗位详情) if pd.notna(row.岗位详情) else ""
        
        info = enhanced_data.get(title, {})
        skills_str = ",".join(info.get("专业技能", [])) if info.get("专业技能") else "无"
        
        # 文本块保持丰富语义
        combined_text = f"{title} {detail[:300]} {skills_str} {industry}"
        
        # ✅ 元数据：仅保留队长要求的 ID/序号相关字段
        metadata = {
            "row_index": int(idx_val),
            "title": title,
            "skills": skills_str,
            "industry": industry,
            "min_salary": int(row.min_salary) if pd.notna(row.min_salary) else -1
        }

        all_texts.append(combined_text)
        all_ids.append(idx_val) 
        all_metadatas.append(metadata)

    # 4. 批量入库
    batch_size = 64 
    print(f"⚡ 开始写入 ChromaDB (总计 {len(all_texts)} 条)...")
    
    for i in tqdm(range(0, len(all_texts), batch_size), desc="入库进度"):
        end = i + batch_size
        batch_txt = all_texts[i:end]
        
        with torch.no_grad():
            embeddings_768 = model.encode(batch_txt, normalize_embeddings=True).tolist()
        
        collection.add(
            embeddings=embeddings_768,
            documents=batch_txt,
            metadatas=all_metadatas[i:end],
            ids=all_ids[i:end]
        )

    print(f"✨ 构建完成！总记录数: {collection.count()}")

if __name__ == "__main__":
    build_vector_db()