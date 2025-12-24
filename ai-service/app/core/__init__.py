"""
Core 模块

提供应用核心功能：配置管理、日志系统等
"""

from app.core.config import get_settings, settings
from app.core.logger import get_logger, setup_logger

__all__ = [
    "settings",
    "get_settings",
    "setup_logger",
    "get_logger",
]
