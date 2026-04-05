from typing import Optional, Dict, Any, List, Tuple
import os
import chromadb
from chromadb.config import Settings
import logging
import requests
from lpm_kernel.configs.logging import get_train_process_logger

logger = get_train_process_logger()


KNOWN_EMBEDDING_MODEL_DIMENSIONS = {
    # OpenAI models
    "text-embedding-ada-002": 1536,
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,

    # Ollama / common local embedding models
    "snowflake-arctic-embed": 768,
    "snowflake-arctic-embed:110m": 768,
    "nomic-embed-text": 768,
    "nomic-embed-text:v1.5": 768,
    "mxbai-embed-large": 1024,
    "mxbai-embed-large:v1": 1024,
}


def create_persistent_chroma_client(chroma_path: Optional[str] = None):
    """Create a Chroma persistent client with anonymized telemetry disabled."""
    persist_directory = chroma_path or os.getenv(
        "CHROMA_PERSIST_DIRECTORY", "./data/chroma_db"
    )
    telemetry_impl = "lpm_kernel.file_data.chroma_telemetry.NoOpProductTelemetry"
    settings = Settings(
        anonymized_telemetry=False,
        chroma_product_telemetry_impl=telemetry_impl,
        chroma_telemetry_impl=telemetry_impl,
        allow_reset=True,
        is_persistent=True,
        persist_directory=persist_directory,
    )
    return chromadb.PersistentClient(path=persist_directory, settings=settings)


def get_embedding_dimension(embedding: List[float]) -> int:
    """
    Get the dimension of an embedding vector
    
    Args:
        embedding: The embedding vector
        
    Returns:
        The dimension of the embedding vector
    """
    return len(embedding)


def match_known_embedding_dimension(model_name: str) -> Optional[int]:
    """Return a known embedding dimension for a model name, if available."""
    if not model_name:
        return None

    if model_name in KNOWN_EMBEDDING_MODEL_DIMENSIONS:
        return KNOWN_EMBEDDING_MODEL_DIMENSIONS[model_name]

    for known_model, dimension in KNOWN_EMBEDDING_MODEL_DIMENSIONS.items():
        if known_model in model_name:
            return dimension

    return None


def detect_embedding_model_dimension(model_name: str) -> Optional[int]:
    """
    Detect the dimension of an embedding model based on its name
    This is a fallback method when we can't get a sample embedding
    
    Args:
        model_name: The name of the embedding model
        
    Returns:
        The dimension of the embedding model, or None if unknown
    """
    known_dimension = match_known_embedding_dimension(model_name)
    if known_dimension is not None:
        return known_dimension
    
    # Default to OpenAI dimension if unknown
    logger.warning(f"Unknown embedding model: {model_name}, defaulting to 1536 dimensions")
    return 1536


def probe_embedding_model_dimension(
    embedding_endpoint: Optional[str],
    embedding_api_key: Optional[str],
    embedding_model_name: Optional[str],
) -> Optional[int]:
    """Probe an embedding provider for the real vector dimension of the configured model."""
    if not embedding_endpoint or not embedding_model_name:
        return None

    normalized_endpoint = embedding_endpoint.rstrip("/")

    try:
        if "sentence-transformers" in normalized_endpoint:
            from sentence_transformers import SentenceTransformer

            os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
            parts = normalized_endpoint.split("/")
            if len(parts) < 2:
                raise ValueError("Invalid sentence-transformers endpoint")

            hf_model_name = "/".join(parts[-2:])
            logger.info(f"Probing Hugging Face embedding dimension for model: {hf_model_name}")
            model = SentenceTransformer(hf_model_name)
            sample_embedding = model.encode(["dimension probe"])
            return get_embedding_dimension(sample_embedding[0])

        logger.info(
            f"Probing OpenAI-compatible embedding dimension for model: {embedding_model_name} via {normalized_endpoint}"
        )
        headers = {"Content-Type": "application/json"}
        if embedding_api_key:
            headers["Authorization"] = f"Bearer {embedding_api_key}"

        response = requests.post(
            f"{normalized_endpoint}/embeddings",
            headers=headers,
            json={"input": ["dimension probe"], "model": embedding_model_name},
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        embedding = result["data"][0]["embedding"]
        return get_embedding_dimension(embedding)
    except Exception as e:
        logger.warning(
            f"Failed to probe embedding dimension for model {embedding_model_name}: {str(e)}"
        )
        return None


def resolve_embedding_model_dimension(user_llm_config: Any) -> int:
    """Resolve the best-known embedding dimension for the configured provider/model."""
    if not user_llm_config or not getattr(user_llm_config, "embedding_model_name", None):
        logger.info("No embedding model configured, using default dimension: 1536")
        return 1536

    embedding_model_name = user_llm_config.embedding_model_name
    known_dimension = match_known_embedding_dimension(embedding_model_name)
    if known_dimension is not None:
        logger.info(
            f"Detected embedding dimension from known model mapping: {known_dimension} for model: {embedding_model_name}"
        )
        return known_dimension

    probed_dimension = probe_embedding_model_dimension(
        getattr(user_llm_config, "embedding_endpoint", None),
        getattr(user_llm_config, "embedding_api_key", None),
        embedding_model_name,
    )
    if probed_dimension is not None:
        logger.info(
            f"Detected embedding dimension by probing provider: {probed_dimension} for model: {embedding_model_name}"
        )
        return probed_dimension

    logger.warning(
        f"Falling back to default embedding dimension 1536 for unknown model: {embedding_model_name}"
    )
    return 1536


def reinitialize_chroma_collections(dimension: int = 1536) -> bool:
    """
    Reinitialize ChromaDB collections with a new dimension
    
    Args:
        dimension: The new dimension for the collections
        
    Returns:
        True if successful, False otherwise
    """
    try:
        chroma_path = os.getenv("CHROMA_PERSIST_DIRECTORY", "./data/chroma_db")
        client = create_persistent_chroma_client(chroma_path)
        
        # Delete and recreate document collection
        try:
            # Check if collection exists before attempting to delete
            try:
                client.get_collection(name="documents")
                client.delete_collection(name="documents")
                logger.info("Deleted 'documents' collection")
            except ValueError:
                logger.info("'documents' collection does not exist, will create new")
        except Exception as e:
            logger.error(f"Error deleting 'documents' collection: {str(e)}", exc_info=True)
            return False
        
        # Create document collection with new dimension
        try:
            client.create_collection(
                name="documents",
                metadata={
                    "hnsw:space": "cosine",
                    "dimension": dimension
                }
            )
            logger.info(f"Created 'documents' collection with dimension {dimension}")
        except Exception as e:
            logger.error(f"Error creating 'documents' collection: {str(e)}", exc_info=True)
            return False
        
        # Delete and recreate chunk collection
        try:
            # Check if collection exists before attempting to delete
            try:
                client.get_collection(name="document_chunks")
                client.delete_collection(name="document_chunks")
                logger.info("Deleted 'document_chunks' collection")
            except ValueError:
                logger.info("'document_chunks' collection does not exist, will create new")
        except Exception as e:
            logger.error(f"Error deleting 'document_chunks' collection: {str(e)}", exc_info=True)
            return False
        
        # Create chunk collection with new dimension
        try:
            client.create_collection(
                name="document_chunks",
                metadata={
                    "hnsw:space": "cosine",
                    "dimension": dimension
                }
            )
            logger.info(f"Created 'document_chunks' collection with dimension {dimension}")
        except Exception as e:
            logger.error(f"Error creating 'document_chunks' collection: {str(e)}", exc_info=True)
            return False
        
        # Verify collections were created with correct dimension
        try:
            doc_collection = client.get_collection(name="documents")
            chunk_collection = client.get_collection(name="document_chunks")
            
            doc_dimension = doc_collection.metadata.get("dimension")
            if doc_dimension != dimension:
                logger.error(f"Verification failed: 'documents' collection has incorrect dimension: {doc_dimension} vs {dimension}")
                return False
                
            chunk_dimension = chunk_collection.metadata.get("dimension")
            if chunk_dimension != dimension:
                logger.error(f"Verification failed: 'document_chunks' collection has incorrect dimension: {chunk_dimension} vs {dimension}")
                return False
                
            logger.info(f"Verification successful: Both collections have correct dimension: {dimension}")
        except Exception as e:
            logger.error(f"Error verifying collections: {str(e)}", exc_info=True)
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error reinitializing ChromaDB collections: {str(e)}", exc_info=True)
        return False