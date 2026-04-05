from lpm_kernel.configs.config import Config


_TRUTHY_VALUES = {"1", "true", "yes", "on"}


def is_public_network_enabled() -> bool:
    """Return whether public-network features should be exposed."""
    value = Config.from_env().get("ENABLE_PUBLIC_NETWORK", "false")
    return str(value).strip().lower() in _TRUTHY_VALUES


def public_network_disabled_message(feature_name: str) -> str:
    return (
        f"{feature_name} is disabled while Second Me is in private local mode. "
        "Set ENABLE_PUBLIC_NETWORK=true in your local .env and restart when you're ready "
        "to join the public network."
    )