from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent
from overrides import override


class NoOpProductTelemetry(ProductTelemetryClient):
    """Disable Chroma product telemetry cleanly for local/private deployments."""

    @override
    def capture(self, event: ProductTelemetryEvent) -> None:
        return None
