import logging
from typing import Optional
from fastapi import Header

logger = logging.getLogger("contextos.auth")

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Simplified auth: Always returns a default user ID to remove multi-user friction.
    """
    return "anonymous_local_user"
