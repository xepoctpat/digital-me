"""
ServerStatus related data transfer objects
"""
from dataclasses import dataclass
from typing import Optional, List


@dataclass
class ProcessInfo:
    """Process Information"""

    pid: int  # process ID
    cpu_percent: float  # CPU usage percentage
    memory_percent: float  # memory usage percentage
    create_time: float
    cmdline: List[str]


@dataclass
class ServerStatus:
    """server status"""

    is_running: bool  # if service is running
    process_info: Optional[ProcessInfo] = None  # process info
    service_type: str = "managed"
    base_url: Optional[str] = None

    @classmethod
    def not_running(cls, service_type: str = "managed", base_url: Optional[str] = None) -> "ServerStatus":
        """create a ServerStatus object representing a not running server"""
        return cls(is_running=False, service_type=service_type, base_url=base_url)

    @classmethod
    def running(
        cls,
        process_info: ProcessInfo,
        service_type: str = "managed",
        base_url: Optional[str] = None,
    ) -> "ServerStatus":
        """create a ServerStatus object representing a running server"""
        return cls(
            is_running=True,
            process_info=process_info,
            service_type=service_type,
            base_url=base_url,
        )

    @classmethod
    def external(cls, base_url: str) -> "ServerStatus":
        """create a ServerStatus object representing a reachable external LLM service"""
        return cls(is_running=True, process_info=None, service_type="external", base_url=base_url)
