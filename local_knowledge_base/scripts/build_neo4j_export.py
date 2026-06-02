"""
build_neo4j_export.py
=====================
负责人B · 岗位图谱知识库 3.3 Neo4j 导出

输入 : data/knowledge_graph/vertical_paths.json
       data/knowledge_graph/lateral_paths.json
输出 : data/knowledge_graph/neo4j_export.cypher

图模型设计
----------
节点类型
  (:JobCategory  {name, type="category"})          -- 职能大类
  (:JobPosition  {name, category, level_index})     -- 具体岗位节点

关系类型
  (:JobPosition)-[:PROMOTES_TO  {step, path_type="vertical"}]->(:JobPosition)
  (:JobPosition)-[:TRANSFERS_TO {similarity, difficulty, skills, action,
                                  transition_period, salary_ref,
                                  path_type="lateral"}]->(:JobPosition)
  (:JobPosition)-[:BELONGS_TO]->(:JobCategory)

建模原则
  • 同名节点只创建一次（MERGE）
  • 晋升关系：沿 full_ladder 相邻两步之间建边
  • 转岗关系：lateral_paths 中每条路径建一条 TRANSFERS_TO 边
"""

import os, re, json
from pathlib import Path

BASE_DIR    = Path(__file__).parent
GRAPH_DIR   = BASE_DIR / "data" / "knowledge_graph"
VERT_JSON   = GRAPH_DIR / "vertical_paths.json"
LAT_JSON    = GRAPH_DIR / "lateral_paths.json"
OUTPUT_CQL  = GRAPH_DIR / "neo4j_export.cypher"
GRAPH_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────
def _escape(s: str) -> str:
    """转义 Cypher 字符串中的单引号"""
    return str(s).replace("\\", "\\\\").replace("'", "\\'")


def _props(**kv) -> str:
    """将 key=value 字典序列化为 Cypher 属性字符串"""
    parts = []
    for k, v in kv.items():
        if isinstance(v, str):
            parts.append(f"{k}: '{_escape(v)}'")
        elif isinstance(v, list):
            items = ", ".join(f"'{_escape(i)}'" for i in v)
            parts.append(f"{k}: [{items}]")
        else:
            parts.append(f"{k}: {v}")
    return "{" + ", ".join(parts) + "}"


# ──────────────────────────────────────────────
# 生成器
# ──────────────────────────────────────────────
def gen_constraints() -> list[str]:
    """唯一约束 + 索引（Neo4j 4.x / 5.x 兼容写法）"""
    return [
        "// ── 约束与索引 ──────────────────────────────────────",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:JobPosition) REQUIRE n.name IS UNIQUE;",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:JobCategory) REQUIRE n.name IS UNIQUE;",
        "CREATE INDEX IF NOT EXISTS FOR (n:JobPosition) ON (n.category);",
        "CREATE INDEX IF NOT EXISTS FOR (n:JobPosition) ON (n.level_index);",
        "",
    ]


def gen_category_nodes(vp: dict) -> list[str]:
    lines = ["// ── 职能大类节点 ─────────────────────────────────────"]
    for cat in vp["category_paths"]:
        ladder     = vp["category_paths"][cat]["full_ladder"]
        n_levels   = len(ladder)
        data_flag  = str(vp["category_paths"][cat]["data_driven"]).lower()
        props = _props(name=cat, type="category",
                       total_levels=n_levels, data_driven=data_flag)
        lines.append(f"MERGE (:JobCategory {props});")
    lines.append("")
    return lines


def gen_position_nodes_from_vertical(vp: dict) -> list[str]:
    """从 full_ladder 中提取所有职位节点"""
    seen = set()
    lines = ["// ── 岗位节点（垂直路径来源）────────────────────────────"]
    for cat, cat_info in vp["category_paths"].items():
        for idx, pos_name in enumerate(cat_info["full_ladder"]):
            if pos_name in seen:
                continue
            seen.add(pos_name)
            props = _props(name=pos_name, category=cat, level_index=idx)
            lines.append(f"MERGE (:JobPosition {props});")
    lines.append("")
    return lines


def gen_position_nodes_from_lateral(lp: dict, existing: set) -> list[str]:
    """补充 lateral_paths 中出现但未在 vertical_paths 中创建的节点"""
    lines = ["// ── 岗位节点（水平路径补充）────────────────────────────"]
    for src_job, info in lp["lateral_paths"].items():
        for src_name in [src_job] + [p["目标岗位"] for p in info["paths"]]:
            if src_name not in existing:
                existing.add(src_name)
                props = _props(name=src_name, category="未分类", level_index=-1)
                lines.append(f"MERGE (:JobPosition {props});")
    lines.append("")
    return lines


def gen_belongs_to_rels(vp: dict) -> list[str]:
    lines = ["// ── BELONGS_TO 关系（岗位 → 大类）──────────────────────"]
    for cat, cat_info in vp["category_paths"].items():
        for pos_name in cat_info["full_ladder"]:
            a = _escape(pos_name)
            b = _escape(cat)
            lines.append(
                f"MATCH (p:JobPosition {{name: '{a}'}}), (c:JobCategory {{name: '{b}'}}) "
                f"MERGE (p)-[:BELONGS_TO]->(c);"
            )
    lines.append("")
    return lines


def gen_vertical_rels(vp: dict) -> list[str]:
    lines = ["// ── PROMOTES_TO 关系（垂直晋升）────────────────────────"]
    for cat, cat_info in vp["category_paths"].items():
        ladder = cat_info["full_ladder"]
        for step_i in range(len(ladder) - 1):
            src_name = _escape(ladder[step_i])
            tgt_name = _escape(ladder[step_i + 1])
            rel_props = _props(
                step=step_i + 1,
                path_type="vertical",
                category=cat,
                data_driven=str(cat_info["data_driven"]).lower(),
            )
            lines.append(
                f"MATCH (a:JobPosition {{name: '{src_name}'}}), "
                f"(b:JobPosition {{name: '{tgt_name}'}}) "
                f"MERGE (a)-[:PROMOTES_TO {rel_props}]->(b);"
            )
    lines.append("")
    return lines


def gen_lateral_rels(lp: dict) -> list[str]:
    lines = ["// ── TRANSFERS_TO 关系（水平转岗）────────────────────────"]
    for src_job, info in lp["lateral_paths"].items():
        for path in info["paths"]:
            tgt   = path["目标岗位"]
            sim   = path["相似度得分"]
            diff  = path["难度"]
            period= path["预计过渡周期"]
            action= path["推荐行动"]
            salary= path["薪资变化参考"]
            skills= path["所需补充技能"]

            a = _escape(src_job)
            b = _escape(tgt)
            rel_props = _props(
                similarity=sim,
                difficulty=diff,
                transition_period=period,
                recommended_action=action,
                salary_change_ref=salary,
                required_skills=skills,
                path_type="lateral",
            )
            lines.append(
                f"MATCH (a:JobPosition {{name: '{a}'}}), "
                f"(b:JobPosition {{name: '{b}'}}) "
                f"MERGE (a)-[:TRANSFERS_TO {rel_props}]->(b);"
            )
    lines.append("")
    return lines


def gen_stats_comment(vp: dict, lp: dict) -> list[str]:
    n_cats     = len(vp["category_paths"])
    n_pos      = sum(len(v["full_ladder"]) for v in vp["category_paths"].values())
    n_prom     = sum(len(v["full_ladder"]) - 1 for v in vp["category_paths"].values())
    n_lat_src  = len(lp["lateral_paths"])
    n_lat_rel  = sum(len(v["paths"]) for v in lp["lateral_paths"].values())
    return [
        "// ═══════════════════════════════════════════════════════════",
        f"// 图统计：",
        f"//   节点 JobCategory   : {n_cats}",
        f"//   节点 JobPosition   : {n_pos}（含去重）",
        f"//   关系 PROMOTES_TO   : {n_prom}",
        f"//   关系 TRANSFERS_TO  : {n_lat_rel}（来源岗位 {n_lat_src} 个）",
        "// ═══════════════════════════════════════════════════════════",
        "",
        "// 快速验证查询（粘贴到 Neo4j Browser 执行）：",
        "// MATCH (n) RETURN labels(n)[0] AS type, count(*) AS cnt;",
        "// MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS cnt;",
        "// MATCH p=(:JobPosition)-[:PROMOTES_TO*1..3]->(:JobPosition) RETURN p LIMIT 5;",
        "// MATCH p=(:JobPosition)-[:TRANSFERS_TO]->(:JobPosition) RETURN p LIMIT 5;",
        "",
    ]


def gen_sample_queries() -> list[str]:
    return [
        "// ── 示例业务查询 ────────────────────────────────────────",
        "// 1. 查找 Java开发工程师 的完整晋升路径（最多5步）",
        "// MATCH p=(start:JobPosition {name:'Java开发工程师'})-[:PROMOTES_TO*1..5]->(end:JobPosition)",
        "//   RETURN [n IN nodes(p) | n.name] AS path LIMIT 10;",
        "",
        "// 2. 查找可从 测试工程师 水平转岗的所有岗位（按难度排序）",
        "// MATCH (src:JobPosition {name:'测试工程师'})-[r:TRANSFERS_TO]->(tgt:JobPosition)",
        "//   RETURN tgt.name AS 目标岗位, r.difficulty AS 难度,",
        "//          r.similarity AS 相似度, r.required_skills AS 所需技能",
        "//   ORDER BY r.similarity DESC;",
        "",
        "// 3. 查找同属 数据分析师 大类的所有职位层级",
        "// MATCH (p:JobPosition)-[:BELONGS_TO]->(c:JobCategory {name:'数据分析师'})",
        "//   RETURN p.name, p.level_index ORDER BY p.level_index;",
        "",
        "// 4. 两岗位间的最短路径（混合垂直+水平）",
        "// MATCH p=shortestPath((a:JobPosition {name:'数据分析师'})",
        "//   -[:PROMOTES_TO|TRANSFERS_TO*1..6]->(b:JobPosition {name:'产品经理'}))",
        "//   RETURN [n IN nodes(p) | n.name] AS path;",
    ]


# ──────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────
def main():
    # 读取输入
    if not VERT_JSON.exists():
        raise FileNotFoundError(f"找不到 {VERT_JSON}，请先运行 build_vertical_paths.py")
    if not LAT_JSON.exists():
        raise FileNotFoundError(f"找不到 {LAT_JSON}，请先运行 build_lateral_paths.py")

    with open(VERT_JSON, encoding="utf-8") as f:
        vp = json.load(f)
    with open(LAT_JSON, encoding="utf-8") as f:
        lp = json.load(f)

    print(f"加载 vertical_paths：{len(vp['category_paths'])} 大类，{len(vp.get('job_paths', {}))} 具体岗位")
    print(f"加载 lateral_paths ：{len(lp['lateral_paths'])} 核心岗位")

    # 收集已知节点名，用于去重
    known_positions: set[str] = set()
    for cat_info in vp["category_paths"].values():
        known_positions.update(cat_info["full_ladder"])

    # 拼装所有 Cypher 块
    cypher_blocks: list[str] = []

    cypher_blocks += [
        "// ╔══════════════════════════════════════════════════════════╗",
        "// ║  岗位图谱知识库 · Neo4j Cypher 导出文件                 ║",
        "// ║  负责人B · 3.3 Neo4j 导出                               ║",
        "// ║  来源：vertical_paths.json + lateral_paths.json          ║",
        "// ╚══════════════════════════════════════════════════════════╝",
        "",
        "// 使用方式：",
        "//   在 Neo4j Browser 中依次粘贴各段，或通过 cypher-shell 批量执行：",
        "//   cypher-shell -u neo4j -p <password> --file neo4j_export.cypher",
        "",
        "// !! 若需清空数据库重新导入，先执行：",
        "// MATCH (n) DETACH DELETE n;",
        "",
    ]

    cypher_blocks += gen_stats_comment(vp, lp)
    cypher_blocks += gen_constraints()
    cypher_blocks += gen_category_nodes(vp)
    cypher_blocks += gen_position_nodes_from_vertical(vp)
    cypher_blocks += gen_position_nodes_from_lateral(lp, known_positions)
    cypher_blocks += gen_belongs_to_rels(vp)
    cypher_blocks += gen_vertical_rels(vp)
    cypher_blocks += gen_lateral_rels(lp)
    cypher_blocks += gen_sample_queries()

    # 写文件
    content = "\n".join(cypher_blocks)
    with open(OUTPUT_CQL, "w", encoding="utf-8") as f:
        f.write(content)

    n_statements = content.count(";")
    print(f"✅ 已生成 {n_statements} 条 Cypher 语句 → {OUTPUT_CQL}")
    print(f"   文件大小：{len(content.encode('utf-8')) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
