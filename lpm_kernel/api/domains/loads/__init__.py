"""Loads domain package.

Avoid importing route modules at package import time so service/client imports
remain lightweight.
"""

__all__ = []
