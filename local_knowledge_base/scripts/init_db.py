import subprocess
import sys
from pathlib import Path

def run_scripts_sequentially():
    """
    依次运行知识库构建的九个关键脚本：
    1. build_jobs.py
    2. build_skills.py
    3. build_skill_relations.py
    4. build_skill_advanced_relations.py
    5. build_jobs_vector.py
    6. build_skill_vectors.py
    7. build_vertical_paths.py
    8. build_lateral_paths.py
    9. build_neo4j_export.py
    """
    # 获取当前脚本所在目录
    script_dir = Path(__file__).parent.resolve()
    
    # 定义需要按顺序执行的脚本列表
    scripts = [
        "build_jobs.py",
        "build_skills.py",
        "build_skill_relations.py",
        "build_skill_advanced_relations.py",
        "build_jobs_vector.py",
        "build_skill_vectors.py",
        "build_vertical_paths.py",
        "build_lateral_paths.py",
        "build_neo4j_export.py"
    ]
    
    for script in scripts:
        script_path = script_dir / script
        
        print(f"[{'='*40}]")
        print(f"🚀 正在运行: {script} ...")
        print(f"[{'='*40}]")
        
        try:
            # 使用当前 Python 解释器执行脚本
            # check=True 表示如果脚本返回非零退出码，则抛出 CalledProcessError 异常
            subprocess.run(
                [sys.executable, str(script_path)],
                check=True,
                text=True
            )
            print(f"✅ {script} 运行成功！\n")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ {script} 运行失败，退出码: {e.returncode}")
            print(f"⚠️ 发生错误，将终止后续脚本的执行以免破坏知识库结构。")
            break
        except FileNotFoundError:
            print(f"❌ 找不到脚本文件: {script_path}")
            print(f"⚠️ 请确保 {script} 与当前 test.py 存放在同一目录下。")
            print(f"终止后续脚本的执行。")
            break

if __name__ == "__main__":
    run_scripts_sequentially()
