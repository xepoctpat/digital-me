from flask import Blueprint, jsonify, request
from http import HTTPStatus
from typing import Dict, Any

from lpm_kernel.api.dto.user_llm_config_dto import UpdateUserLLMConfigDTO
from lpm_kernel.api.services.user_llm_config_service import UserLLMConfigService
from lpm_kernel.api.common.responses import APIResponse
from lpm_kernel.common.logging import logger

user_llm_config_bp = Blueprint("user_llm_config", __name__, url_prefix="/api/user-llm-configs")
user_llm_config_service = UserLLMConfigService()

# OpenAI configuration constants
OPENAI_ENDPOINT = "https://api.openai.com/v1"
OLLAMA_DEFAULT_ENDPOINT = "http://127.0.0.1:11434/v1"
OLLAMA_PLACEHOLDER_KEY = "ollama"


def normalize_openai_compatible_endpoint(endpoint: str) -> str:
    """Normalize OpenAI-compatible endpoints to `/v1` base URLs."""
    normalized_endpoint = endpoint.rstrip("/")
    if normalized_endpoint.endswith("/v1"):
        return normalized_endpoint
    return f"{normalized_endpoint}/v1"

def validate_llm_config(data: Dict[Any, Any]) -> Dict[str, str]:
    """Validate LLM configuration based on provider type
    
    Args:
        data: Configuration data
        
    Returns:
        Dictionary with error messages if validation fails, empty dict if validation passes
    """
    errors = {}
    provider_type = data.get('provider_type')
    
    if provider_type == 'openai':
        # For OpenAI, key is required
        if not data.get('key'):
            errors['key'] = 'API key is required for OpenAI provider'
    elif provider_type == 'ollama':
        if not (data.get('chat_endpoint') or data.get('embedding_endpoint')):
            errors['chat_endpoint'] = 'chat_endpoint or embedding_endpoint is required for Ollama provider'

        required_fields = ['chat_model_name', 'embedding_model_name']
        for field in required_fields:
            if not data.get(field):
                errors[field] = f'{field} is required for Ollama provider'
    elif provider_type:
        # For custom providers, all endpoint and key fields are required
        required_fields = [
            'chat_endpoint', 'chat_api_key', 'chat_model_name',
            'embedding_endpoint', 'embedding_api_key', 'embedding_model_name'
        ]
        for field in required_fields:
            if not data.get(field):
                errors[field] = f'{field} is required for custom provider'
    else:
        errors['provider_type'] = 'provider_type is required'
    
    return errors


def validate_thinking_model(data: Dict[Any, Any]) -> Dict[str, str]:
    """Validate thinking model configuration
    
    Args:
        data: Configuration data
        
    Returns:
        Dictionary with error messages if validation fails, empty dict if validation passes
    """
    errors = {}
    
    # Validate required fields
    if not data.get('thinking_model_name'):
        errors['thinking_model_name'] = 'Thinking model name is required'
    
    if not data.get('thinking_endpoint'):
        errors['thinking_endpoint'] = 'Thinking endpoint is required'
    
    return errors

def process_provider_config(data: Dict[Any, Any]) -> Dict[Any, Any]:
    """Process provider-specific configuration defaults and normalization."""
    provider_type = data.get('provider_type')
    data['provider_type'] = provider_type

    if provider_type == 'openai' and data.get('key'):
        # Use the unified key to fill chat and embedding api_keys
        data['chat_api_key'] = data['key']
        data['chat_model_name'] ='gpt-4o-mini'
        data['embedding_api_key'] = data['key']
        data['embedding_model_name'] = 'text-embedding-ada-002'
        data['chat_endpoint'] = OPENAI_ENDPOINT
        data['embedding_endpoint'] = OPENAI_ENDPOINT
    elif provider_type == 'ollama':
        shared_key = (
            data.get('key') or
            data.get('chat_api_key') or
            data.get('embedding_api_key') or
            OLLAMA_PLACEHOLDER_KEY
        )
        shared_endpoint = (
            data.get('chat_endpoint') or
            data.get('embedding_endpoint') or
            OLLAMA_DEFAULT_ENDPOINT
        )
        normalized_endpoint = normalize_openai_compatible_endpoint(shared_endpoint)

        data['key'] = shared_key
        data['chat_api_key'] = data.get('chat_api_key') or shared_key
        data['embedding_api_key'] = data.get('embedding_api_key') or shared_key
        data['chat_endpoint'] = normalize_openai_compatible_endpoint(data.get('chat_endpoint') or normalized_endpoint)
        data['embedding_endpoint'] = normalize_openai_compatible_endpoint(data.get('embedding_endpoint') or normalized_endpoint)
            
    return data





@user_llm_config_bp.route("", methods=["GET"])
def get_config():
    """Get LLM configuration"""
    try:
        config = user_llm_config_service.get_available_llm()  # Default configuration ID is 1
        if not config:
            # Return null instead of 404 when no configuration is found
            return jsonify(
                APIResponse.success(
                    data=None,
                    message="No LLM configuration found"
                )
            ), HTTPStatus.OK
        return jsonify(
            APIResponse.success(
                data=config.dict(),
                message="Successfully retrieved LLM configuration"
            )
        ), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Failed to retrieve configuration: {str(e)}", exc_info=True)
        return jsonify(
            APIResponse.error(f"Failed to retrieve configuration: {str(e)}")
        ), HTTPStatus.INTERNAL_SERVER_ERROR


@user_llm_config_bp.route("", methods=["PUT"])
def update_config():
    """Update LLM configuration"""
    try:
        # Validate request data
        request_data = dict(request.json or {})
        validation_errors = validate_llm_config(request_data)
        
        if validation_errors:
            error_message = "; ".join([f"{k}: {v}" for k, v in validation_errors.items()])
            return jsonify(
                APIResponse.error(f"Validation failed: {error_message}")
            ), HTTPStatus.BAD_REQUEST
        
        # Process request data
        processed_data = process_provider_config(request_data)
        data = UpdateUserLLMConfigDTO(**processed_data)
        config = user_llm_config_service.update_config(1, data)  # Default configuration ID is 1
        
        return jsonify(
            APIResponse.success(
                data=config.dict(),
                message="Configuration updated successfully"
            )
        ), HTTPStatus.OK
    
    except Exception as e:
        logger.error(f"Failed to update configuration: {str(e)}", exc_info=True)
        return jsonify(
            APIResponse.error(f"Failed to update configuration: {str(e)}")
        ), HTTPStatus.INTERNAL_SERVER_ERROR





@user_llm_config_bp.route("/thinking", methods=["PUT"])
def update_thinking_model():
    """Update thinking model configuration"""
    try:
        # Validate request data
        request_data = request.json
        validation_errors = validate_thinking_model(request_data)
        
        if validation_errors:
            error_message = "; ".join([f"{k}: {v}" for k, v in validation_errors.items()])
            return jsonify(
                APIResponse.error(f"Validation failed: {error_message}")
            ), HTTPStatus.BAD_REQUEST
        
        # Create a DTO with only thinking model fields
        thinking_data = {}
        if 'thinking_model_name' in request_data:
            thinking_data['thinking_model_name'] = request_data['thinking_model_name']
        if 'thinking_endpoint' in request_data:
            thinking_data['thinking_endpoint'] = request_data['thinking_endpoint']
        if 'thinking_api_key' in request_data:
            thinking_data['thinking_api_key'] = request_data['thinking_api_key']
        
        # Update the configuration
        data = UpdateUserLLMConfigDTO(**thinking_data)
        config = user_llm_config_service.update_config(1, data)  # Default configuration ID is 1
        
        return jsonify(
            APIResponse.success(
                data=config.dict(),
                message="Thinking model configuration updated successfully"
            )
        ), HTTPStatus.OK
    
    except Exception as e:
        logger.error(f"Failed to update thinking model configuration: {str(e)}", exc_info=True)
        return jsonify(
            APIResponse.error(f"Failed to update thinking model configuration: {str(e)}")
        ), HTTPStatus.INTERNAL_SERVER_ERROR


@user_llm_config_bp.route("/key", methods=["DELETE"])
def delete_key():
    """Delete API key from LLM configuration"""
    try:
        # use default configuration ID (1)
        config = user_llm_config_service.delete_key()
        if not config:
            return jsonify(
                APIResponse.error("No LLM configuration found")
            ), HTTPStatus.NOT_FOUND
            
        return jsonify(
            APIResponse.success(
                data=config.dict(),
                message="API key deleted successfully"
            )
        ), HTTPStatus.OK
    
    except Exception as e:
        logger.error(f"Failed to delete API key: {str(e)}", exc_info=True)
        return jsonify(
            APIResponse.error(f"Failed to delete API key: {str(e)}")
        ), HTTPStatus.INTERNAL_SERVER_ERROR
