"""API domains package.

Keep this module import-light so booting the Flask app does not eagerly load
the full training stack on platforms that only need chat or external local-LLM features.
"""

__all__ = []