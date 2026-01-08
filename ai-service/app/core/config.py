"""
Core configuration module

Re-exports settings from app.config.settings for backward compatibility
"""

from app.config.settings import settings

__all__ = ["settings"]
