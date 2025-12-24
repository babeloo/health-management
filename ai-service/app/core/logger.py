"""
日志配置模块

使用 loguru 进行日志管理
"""

import sys
from pathlib import Path

from loguru import logger

from app.core.config import settings


def setup_logger() -> None:
    """
    配置日志系统

    - 移除默认的 logger 配置
    - 添加控制台输出
    - 添加文件输出（按大小轮转）
    - 根据环境变量设置日志级别
    """
    # 移除默认的 logger
    logger.remove()

    # 添加控制台输出
    logger.add(
        sys.stderr,
        format=settings.log_format,
        level=settings.log_level,
        colorize=True,
        backtrace=True,
        diagnose=True,
    )

    # 创建日志目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # 添加文件输出 - 所有日志
    logger.add(
        log_dir / "app.log",
        format=settings.log_format,
        level=settings.log_level,
        rotation=settings.log_rotation,
        retention=settings.log_retention,
        compression="zip",
        backtrace=True,
        diagnose=True,
        enqueue=True,  # 异步写入
    )

    # 添加文件输出 - 错误日志
    logger.add(
        log_dir / "error.log",
        format=settings.log_format,
        level="ERROR",
        rotation=settings.log_rotation,
        retention=settings.log_retention,
        compression="zip",
        backtrace=True,
        diagnose=True,
        enqueue=True,
    )

    logger.info(f"Logger initialized with level: {settings.log_level}")
    logger.info(f"Environment: {settings.environment}")


def get_logger(name: str):
    """
    获取指定名称的 logger

    Args:
        name: logger 名称（通常为模块名）

    Returns:
        logger 实例
    """
    return logger.bind(name=name)


# 初始化日志系统
setup_logger()
