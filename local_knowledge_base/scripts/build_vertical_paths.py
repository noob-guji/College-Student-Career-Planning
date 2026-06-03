"""
build_vertical_paths.py
=======================
负责人B · 岗位图谱知识库 3.1 垂直晋升路径

输入 : jobs_cleaned_1.xls + jobs_cleaned_2.xls（合并为 jobs_cleaned.csv）
输出 : vertical_paths.json

逻辑
----
1. 合并两张表 → jobs_cleaned.csv
2. 从岗位名称中提取"职能大类"和"职级关键词"
3. 优先利用同公司多条记录做薪资排序推断真实晋升阶梯
4. 补充基于职级关键词的规则推断路径
5. 为每个核心岗位生成结构化路径字典
"""

import os
import re
import json
import logging
import pandas as pd
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 0. 配置
# ──────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, "data", "processed")
GRAPH_DIR  = os.path.join(BASE_DIR, "data", "knowledge_graph")
OUTPUT_CSV = os.path.join(DATA_DIR,  "jobs_cleaned.csv")
OUTPUT_JSON= os.path.join(GRAPH_DIR, "vertical_paths.json")

os.makedirs(DATA_DIR,  exist_ok=True)
os.makedirs(GRAPH_DIR, exist_ok=True)

# ──────────────────────────────────────────────
# 职级层级定义（越靠前越初级）
# ──────────────────────────────────────────────
LEVEL_KEYWORDS_ORDERED = [
    ["实习", "助理", "专员"],        # L0 – entry
    ["初级", "junior", "jr"],        # L1
    ["中级", "intermediate"],        # L2
    ["高级", "senior", "sr", "资深"],# L3
    ["专家", "expert"],              # L4
    ["首席", "principal", "staff"],  # L5
    ["架构师", "architect"],         # L6
    ["经理", "manager"],             # L7
    ["总监", "director"],            # L8
    ["vp", "副总裁"],                # L9
    ["cto", "coo", "ceo", "总裁", "董事"],  # L10
]

LEVEL_LABEL_MAP = {kw: idx for idx, kws in enumerate(LEVEL_KEYWORDS_ORDERED) for kw in kws}

# ──────────────────────────────────────────────
# 职能大类关键词  →  大类名称
# ──────────────────────────────────────────────
FUNCTION_KEYWORDS = {
    # 技术研发
    "java":         "Java开发",
    "python":       "Python开发",
    "c/c++":        "C/C++开发",
    "前端":         "前端开发",
    "后端":         "后端开发",
    "全栈":         "全栈开发",
    "安卓":         "Android开发",
    "android":      "Android开发",
    "ios":          "iOS开发",
    "嵌入式":       "嵌入式开发",
    "算法":         "算法工程师",
    "ai":           "AI/机器学习",
    "机器学习":     "AI/机器学习",
    "大数据":       "大数据开发",
    "数据开发":     "大数据开发",
    "运维":         "运维工程师",
    "devops":       "运维工程师",
    "安全":         "信息安全",
    "网络工程":     "网络工程师",
    "硬件":         "硬件工程师",
    "测试工程":     "测试工程师",
    "软件测试":     "测试工程师",
    "qa":           "测试工程师",
    "实施工程":     "实施工程师",
    "技术支持":     "技术支持工程师",
    # 产品 & 设计
    "产品经理":     "产品经理",
    "产品专员":     "产品经理",
    "ui":           "UI/UX设计师",
    "ux":           "UI/UX设计师",
    "交互设计":     "UI/UX设计师",
    "平面设计":     "平面设计师",
    "视觉设计":     "视觉设计师",
    # 数据
    "数据分析":     "数据分析师",
    "bi工程":       "BI工程师",
    "商业分析":     "商业分析师",
    # 运营 & 市场
    "运营":         "运营专员",
    "市场":         "市场专员",
    "品牌":         "品牌专员",
    "新媒体":       "新媒体运营",
    "内容运营":     "内容运营",
    "社区运营":     "社区运营",
    "电商运营":     "电商运营",
    # 销售 & 商务
    "销售":         "销售",
    "商务":         "商务拓展",
    "客户经理":     "客户经理",
    "大客户":       "大客户销售",
    "广告销售":     "广告销售",
    # 职能支持
    "人力":         "HR",
    "招聘":         "招聘专员",
    "财务":         "财务",
    "会计":         "会计",
    "法务":         "法务",
    "行政":         "行政",
    "供应链":       "供应链",
    "项目管理":     "项目经理",
    "项目经理":     "项目经理",
}

# 每个大类的完整晋升阶梯配置
# （key: 职能大类, value: 按级别从低到高的职位序列）
CAREER_LADDER_TEMPLATE = {
    # ── 技术研发类
    "Java开发":           ["Java实习生", "初级Java开发工程师", "Java开发工程师",
                           "高级Java开发工程师", "Java架构师", "技术经理", "技术总监"],
    "Python开发":         ["Python实习生", "初级Python开发工程师", "Python开发工程师",
                           "高级Python开发工程师", "Python架构师", "技术经理", "技术总监"],
    "C/C++开发":          ["C/C++实习生", "初级C/C++开发工程师", "C/C++开发工程师",
                           "高级C/C++开发工程师", "C/C++架构师", "技术经理", "技术总监"],
    "前端开发":           ["前端实习生", "初级前端开发工程师", "前端开发工程师",
                           "高级前端开发工程师", "前端架构师", "前端技术经理", "技术总监"],
    "后端开发":           ["后端实习生", "初级后端开发工程师", "后端开发工程师",
                           "高级后端开发工程师", "后端架构师", "技术经理", "技术总监"],
    "全栈开发":           ["全栈实习生", "初级全栈开发工程师", "全栈开发工程师",
                           "高级全栈开发工程师", "全栈架构师", "技术总监"],
    "Android开发":        ["Android实习生", "初级Android开发工程师", "Android开发工程师",
                           "高级Android开发工程师", "Android架构师", "移动端技术总监"],
    "iOS开发":            ["iOS实习生", "初级iOS开发工程师", "iOS开发工程师",
                           "高级iOS开发工程师", "iOS架构师", "移动端技术总监"],
    "嵌入式开发":         ["嵌入式实习生", "初级嵌入式软件工程师", "嵌入式软件工程师",
                           "高级嵌入式软件工程师", "嵌入式架构师", "硬件研发总监"],
    "算法工程师":         ["算法实习生", "初级算法工程师", "算法工程师",
                           "高级算法工程师", "算法专家", "首席算法科学家", "AI研究总监"],
    "AI/机器学习":        ["AI实习生", "机器学习工程师", "高级机器学习工程师",
                           "AI算法专家", "AI研究员", "首席科学家", "AI总监"],
    "大数据开发":         ["大数据实习生", "大数据开发工程师", "高级大数据开发工程师",
                           "大数据架构师", "数据平台总监"],
    "运维工程师":         ["运维实习生", "初级运维工程师", "运维工程师",
                           "高级运维工程师", "运维架构师", "DevOps专家", "运维总监"],
    "信息安全":           ["信息安全实习生", "信息安全工程师", "高级信息安全工程师",
                           "安全架构师", "安全专家", "首席安全官(CSO)"],
    "网络工程师":         ["网络实习生", "网络工程师", "高级网络工程师",
                           "网络架构师", "网络总监"],
    "硬件工程师":         ["硬件实习生", "初级硬件工程师", "硬件工程师",
                           "高级硬件工程师", "硬件专家", "硬件研发总监"],
    "测试工程师":         ["测试实习生", "初级测试工程师", "测试工程师",
                           "高级测试工程师", "测试专家", "测试架构师", "QA总监"],
    "实施工程师":         ["实施实习生", "实施工程师", "高级实施工程师",
                           "实施顾问", "解决方案架构师", "售前总监"],
    "技术支持工程师":     ["技术支持专员", "技术支持工程师", "高级技术支持工程师",
                           "技术支持经理", "技术服务总监"],
    # ── 产品与设计类
    "产品经理":           ["产品实习生", "产品助理", "产品专员", "初级产品经理",
                           "产品经理", "高级产品经理", "产品总监", "CPO"],
    "UI/UX设计师":        ["设计实习生", "初级UI设计师", "UI/UX设计师",
                           "高级UI/UX设计师", "交互设计专家", "设计总监"],
    "平面设计师":         ["设计实习生", "初级平面设计师", "平面设计师",
                           "高级平面设计师", "创意总监"],
    "视觉设计师":         ["设计实习生", "视觉设计师", "高级视觉设计师",
                           "视觉设计专家", "创意总监"],
    # ── 数据类
    "数据分析师":         ["数据分析实习生", "初级数据分析师", "数据分析师",
                           "高级数据分析师", "数据分析专家", "数据分析经理", "数据总监"],
    "BI工程师":           ["BI实习生", "初级BI工程师", "BI工程师",
                           "高级BI工程师", "BI架构师", "数据平台总监"],
    "商业分析师":         ["商业分析实习生", "商业分析师", "高级商业分析师",
                           "商业洞察经理", "业务总监"],
    # ── 运营 & 市场类
    "运营专员":           ["运营实习生", "运营助理", "运营专员",
                           "运营主管", "运营经理", "运营总监"],
    "市场专员":           ["市场实习生", "市场助理", "市场专员",
                           "市场经理", "市场总监", "CMO"],
    "品牌专员":           ["品牌实习生", "品牌助理", "品牌专员",
                           "品牌经理", "品牌总监"],
    "新媒体运营":         ["新媒体实习生", "新媒体助理", "新媒体运营专员",
                           "新媒体运营主管", "内容运营总监"],
    "内容运营":           ["内容实习生", "内容运营助理", "内容运营专员",
                           "内容运营主管", "内容运营总监"],
    "社区运营":           ["社区运营实习生", "社区运营助理", "社区运营专员",
                           "社区运营经理", "社区总监"],
    "电商运营":           ["电商运营实习生", "电商运营助理", "电商运营专员",
                           "电商运营经理", "电商运营总监"],
    # ── 销售 & 商务类
    "销售":               ["销售实习生", "销售助理", "销售专员",
                           "销售代表", "销售经理", "大区销售总监", "销售副总裁"],
    "商务拓展":           ["商务助理", "商务专员", "商务经理",
                           "商务总监", "VP Business Development"],
    "客户经理":           ["客服专员", "客户代表", "客户经理",
                           "高级客户经理", "大客户总监"],
    "大客户销售":         ["销售专员", "大客户代表", "大客户经理",
                           "高级大客户经理", "大客户总监"],
    "广告销售":           ["广告销售助理", "广告销售专员", "广告销售经理",
                           "广告销售总监"],
    # ── 职能支持类
    "HR":                 ["HR实习生", "HR助理/专员", "HRBP", "HR经理",
                           "HR总监", "CHO"],
    "招聘专员":           ["招聘实习生", "招聘助理", "招聘专员",
                           "招聘主管", "招聘经理", "人才招募总监"],
    "财务":               ["财务实习生", "财务助理", "财务专员",
                           "财务主管", "财务经理", "财务总监", "CFO"],
    "会计":               ["会计实习生", "出纳/初级会计", "会计",
                           "高级会计", "会计主管", "财务经理", "财务总监"],
    "法务":               ["法务实习生", "法务助理", "法务专员",
                           "法务经理", "法务总监", "CLO"],
    "行政":               ["行政实习生", "行政助理", "行政专员",
                           "行政主管", "行政经理", "行政总监"],
    "供应链":             ["供应链实习生", "采购/物流专员", "供应链专员",
                           "供应链主管", "供应链经理", "供应链总监", "COO"],
    "项目经理":           ["项目助理", "初级项目经理", "项目经理",
                           "高级项目经理", "项目总监", "PMO"],
}


# ──────────────────────────────────────────────
# 1. 数据读取与合并
# ──────────────────────────────────────────────
def load_and_merge(file1: str, file2: str) -> pd.DataFrame:
    """读取两张 xls 并合并；df2 无 header，复用 df1 的列名"""
    logger.info("读取 %s", file1)
    df1 = pd.read_excel(file1, engine="xlrd")

    logger.info("读取 %s", file2)
    df2 = pd.read_excel(file2, engine="xlrd", header=None, names=df1.columns)

    df = pd.concat([df1, df2], ignore_index=True)
    logger.info("合并后总行数：%d，列数：%d", *df.shape)

    # 保存 CSV
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    logger.info("已保存 → %s", OUTPUT_CSV)
    return df


# ──────────────────────────────────────────────
# 2. 职能大类识别
# ──────────────────────────────────────────────
def classify_function(title: str) -> str | None:
    """将岗位名称映射到职能大类，返回 None 表示未匹配"""
    title_lower = title.lower()
    for kw, category in FUNCTION_KEYWORDS.items():
        if kw in title_lower:
            return category
    return None


# ──────────────────────────────────────────────
# 3. 职级识别
# ──────────────────────────────────────────────
def detect_level(title: str) -> int:
    """返回职位的级别索引（越大越高级），默认 -1 表示未识别"""
    title_lower = title.lower()
    detected = -1
    for kw, lvl in LEVEL_LABEL_MAP.items():
        if kw in title_lower:
            detected = max(detected, lvl)
    return detected


# ──────────────────────────────────────────────
# 4. 真实晋升路径提取（基于同公司薪资排序）
# ──────────────────────────────────────────────
def extract_real_paths(df: pd.DataFrame) -> dict[str, list[str]]:
    """
    对"同一公司"出现的同职能大类岗位按薪资中位数排序，
    推断真实晋升链条，返回 {职能大类: [title_low → ... → title_high]}
    """
    real_chains: dict[str, list[str]] = {}

    df = df.copy()
    df["_func"] = df["岗位名称"].apply(lambda t: classify_function(str(t)))
    df["_mid_salary"] = (df["min_salary"].fillna(0) + df["max_salary"].fillna(0)) / 2

    grouped = df.dropna(subset=["公司名称", "_func"]).groupby(["公司名称", "_func"])

    for (company, func), grp in grouped:
        if len(grp) < 2:
            continue
        # 按薪资中位数排序
        sorted_titles = (
            grp.groupby("岗位名称")["_mid_salary"]
            .median()
            .sort_values()
            .index.tolist()
        )
        if len(sorted_titles) >= 2:
            if func not in real_chains:
                real_chains[func] = []
            # 仅保留最长的链条
            if len(sorted_titles) > len(real_chains[func]):
                real_chains[func] = sorted_titles

    logger.info("从历史数据中提取到 %d 个职能大类的真实晋升链", len(real_chains))
    return real_chains


# ──────────────────────────────────────────────
# 5. 构建最终路径字典
# ──────────────────────────────────────────────
def build_vertical_paths(
    df: pd.DataFrame,
    real_chains: dict[str, list[str]],
) -> dict:
    """
    为数据集中出现的每个职能大类 + 各个具体岗位生成路径字典。

    路径字典格式（与文档示例对齐）：
    {
      "职位名称": {
        "category": "职能大类",
        "level_index": 2,
        "promotion_path": ["下一步A", "下一步B", ...],   # 当前→未来
        "full_ladder": ["L0", "L1", ..., "LN"],          # 完整阶梯
        "data_driven": true/false                         # 是否基于真实数据
      }
    }
    """
    # 收集数据集中出现的所有岗位名称
    all_titles = df["岗位名称"].dropna().unique().tolist()

    vertical_paths: dict = {}

    # ── 5a. 先为每个大类建立"标准阶梯"
    category_ladders: dict[str, dict] = {}
    for category, ladder in CAREER_LADDER_TEMPLATE.items():
        # 若有数据驱动的链条，将其合并进标准阶梯
        data_ladder = real_chains.get(category, [])
        merged = _merge_ladders(ladder, data_ladder)
        category_ladders[category] = {
            "ladder": merged,
            "data_driven": len(data_ladder) > 0,
        }

    # ── 5b. 为数据集每个具体岗位生成路径条目
    for raw_title in all_titles:
        title = str(raw_title).strip()
        category = classify_function(title)
        if not category or category not in category_ladders:
            continue

        info = category_ladders[category]
        ladder: list[str] = info["ladder"]
        data_driven: bool = info["data_driven"]

        # 当前职位在阶梯中的位置
        pos = _find_position_in_ladder(title, ladder)

        if pos == -1:
            # 未在阶梯中，用职级关键词推断位置
            lvl = detect_level(title)
            pos = _level_to_ladder_index(lvl, len(ladder))

        next_steps = ladder[pos + 1:] if pos >= 0 else ladder[1:]  # 往后的所有步骤

        vertical_paths[title] = {
            "category": category,
            "current_ladder_index": pos if pos >= 0 else 0,
            "promotion_path": next_steps[:5],   # 最多列出 5 步
            "full_ladder": ladder,
            "data_driven": data_driven,
        }

    # ── 5c. 补充大类维度的汇总路径（按文档示例格式）
    category_summary: dict = {}
    for category, info in category_ladders.items():
        ladder = info["ladder"]
        n = len(ladder)
        # 为"初级/中级/高级"三个起点各生成前向路径
        # 用三等分近似
        entry   = max(0, n // 5)
        mid_l   = max(0, n * 2 // 5)
        senior  = max(0, n * 3 // 5)
        category_summary[category] = {
            "full_ladder": ladder,
            "data_driven": info["data_driven"],
            "paths_by_level": {
                "初级": ladder[entry + 1:] if entry + 1 < n else [],
                "中级": ladder[mid_l + 1:] if mid_l + 1 < n else [],
                "高级": ladder[senior + 1:] if senior + 1 < n else [],
            },
        }

    return {
        "meta": {
            "total_job_titles": len(vertical_paths),
            "total_categories": len(category_summary),
            "data_driven_categories": sum(
                1 for v in category_summary.values() if v["data_driven"]
            ),
            "description": (
                "垂直晋升路径知识库。"
                "data_driven=true 表示路径融合了历史招聘数据中"
                "同一公司的薪资排序结果；=false 表示纯规则推断。"
            ),
        },
        "category_paths": category_summary,
        "job_paths": vertical_paths,
    }


# ──────────────────────────────────────────────
# 辅助函数
# ──────────────────────────────────────────────
def _merge_ladders(base: list[str], extra: list[str]) -> list[str]:
    """将 extra 中不在 base 的职位名称按薪资隐含顺序插入 base"""
    seen = set(base)
    merged = list(base)
    for title in extra:
        if title not in seen:
            # 粗略插到末尾（可细化）
            merged.append(title)
            seen.add(title)
    return merged


def _find_position_in_ladder(title: str, ladder: list[str]) -> int:
    """精确匹配 + 模糊匹配（包含关系）"""
    title_lower = title.lower()
    for i, step in enumerate(ladder):
        if step.lower() == title_lower:
            return i
    for i, step in enumerate(ladder):
        if title_lower in step.lower() or step.lower() in title_lower:
            return i
    return -1


def _level_to_ladder_index(lvl: int, ladder_len: int) -> int:
    """将 0-10 的职级映射到阶梯索引"""
    if lvl < 0:
        return 0
    ratio = lvl / 10.0
    return min(int(ratio * ladder_len), ladder_len - 2)


# ──────────────────────────────────────────────
# 6. 主流程
# ──────────────────────────────────────────────
def main():
    # ── 路径适配：支持"脚本同目录"或"当前目录下 data/ 子目录"两种部署
    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    os.makedirs(raw_dir, exist_ok=True)

    # 自动发现 xls 文件（优先 data/raw，再找当前目录）
    candidates = [
        (os.path.join(raw_dir,  "jobs_cleaned_1.xls"),
         os.path.join(raw_dir,  "jobs_cleaned_2.xls")),
        (os.path.join(BASE_DIR, "jobs_cleaned_1.xlsx"),
         os.path.join(BASE_DIR, "jobs_cleaned_2.xlsx")),
    ]
    file1 = file2 = None
    for f1, f2 in candidates:
        if os.path.exists(f1) and os.path.exists(f2):
            file1, file2 = f1, f2
            break

    if not file1:
        raise FileNotFoundError(
            "未找到输入文件。请将 jobs_cleaned_1.xls / jobs_cleaned_2.xls "
            "放入 data/raw/ 目录，或将转换后的 .xlsx 放在脚本同目录。"
        )

    # Step 1：合并
    df = load_and_merge(file1, file2)

    # Step 2：提取真实晋升链
    real_chains = extract_real_paths(df)

    # Step 3：构建路径字典
    result = build_vertical_paths(df, real_chains)

    # Step 4：保存
    with open(OUTPUT_JSON, "w", encoding="utf-8") as fp:
        json.dump(result, fp, ensure_ascii=False, indent=2)

    logger.info("✅ 完成！共生成 %d 个岗位路径，%d 个职能大类",
                result["meta"]["total_job_titles"],
                result["meta"]["total_categories"])
    logger.info("已保存 → %s", OUTPUT_JSON)

    # 打印示例
    sample_key = next(iter(result["job_paths"]))
    logger.info("\n示例岗位路径（%s）：\n%s",
                sample_key,
                json.dumps(result["job_paths"][sample_key], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
