import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import sqlite3
import os

# ========== 自动适配项目路径（修复路径报错）==========
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 数据库绝对路径
db_path = os.path.join(project_root, "database", "knowledge.db")
# 向量库保存路径
vector_save_dir = os.path.join(project_root, "vector_db", "skill_vectors")

# ---------- 1. 读取技能 ----------
conn = sqlite3.connect(db_path)
skills = [row[0] for row in conn.execute('SELECT skill_name FROM skills')]
conn.close()

# ---------- 2. 加载模型 ----------
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')

# ---------- 3. 向量化 ----------
vectors = model.encode(skills, normalize_embeddings=True)

# ---------- 4. FAISS ----------
dim = vectors.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(vectors.astype(np.float32))

# ---------- 5. 保存 ----------
os.makedirs(vector_save_dir, exist_ok=True)

faiss.write_index(index, os.path.join(vector_save_dir, "skills.index"))
np.save(os.path.join(vector_save_dir, "skill_names.npy"), np.array(skills))

print("✅ 技能向量库构建完成")