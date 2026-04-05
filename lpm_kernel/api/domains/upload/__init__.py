"""Upload domain package.

Keep package initialization side-effect free so importing helpers like
`upload.client` does not eagerly import route modules.
"""

__all__ = []
