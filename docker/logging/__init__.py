"""
Structured logging setup with JSON output for production use.
Logs to JSON format for easier parsing and analysis.
"""

import logging.config
import json
import os
from pathlib import Path

def setup_structured_logging():
    """Initialize structured logging with JSON formatter."""
    
    log_dir = Path(os.getenv('LOCAL_LOG_DIR', '/app/logs'))
    log_dir.mkdir(parents=True, exist_ok=True)
    
    config_file = Path(__file__).parent / 'logging_config.json'
    
    if config_file.exists():
        with open(config_file) as f:
            config = json.load(f)
            logging.config.dictConfig(config)
    else:
        # Fallback basic config
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s [%(levelname)s] %(name)s:%(funcName)s:%(lineno)d - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.handlers.RotatingFileHandler(
                    log_dir / 'app.log',
                    maxBytes=10485760,
                    backupCount=10
                )
            ]
        )
    
    return logging.getLogger(__name__)

logger = setup_structured_logging()
