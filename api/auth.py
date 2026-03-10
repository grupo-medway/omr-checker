import hmac

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


def require_v1_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    settings = get_settings()
    if not settings.auth_enabled:
        return

    expected_token = settings.api_token
    actual_token = credentials.credentials if credentials else ""
    if credentials is None or credentials.scheme.lower() != "bearer" or not hmac.compare_digest(actual_token, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
