"""
配置加载测试脚本

用于验证配置文件的加载顺序和覆盖机制
"""

import sys
from pathlib import Path

# 添加 app 目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings


def main():
    print("\n" + "=" * 70)
    print("AI Service Configuration Loading Test")
    print("=" * 70)

    # 打印配置文件信息
    settings.print_config_info()

    print("\n[测试说明]")
    print("1. 根目录 .env 文件提供全局默认配置")
    print("2. ai-service/.env 文件覆盖全局配置中的相同项")
    print("3. 环境变量具有最高优先级，可覆盖所有配置文件")
    print("\n[使用示例]")
    print("  # 测试环境变量覆盖")
    print("  DEEPSEEK_MODEL=custom-model python test_config.py")
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    main()
