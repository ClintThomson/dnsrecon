import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from dnsrecon.supabase_client import get_supabase_client

security = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.environ['SUPABASE_URL'].rstrip('/')
        jwks_url = f'{supabase_url}/auth/v1/.well-known/jwks.json'
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _get_jwt_secret() -> str:
    return os.environ['SUPABASE_JWT_SECRET']


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Validate the Supabase JWT and return the user payload."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Missing authentication token',
        )

    token = credentials.credentials

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get('alg', 'HS256')

        if alg == 'ES256':
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=['ES256'],
                options={'verify_aud': False},
            )
        else:
            payload = jwt.decode(
                token,
                _get_jwt_secret(),
                algorithms=['HS256'],
                options={'verify_aud': False},
            )

        user_id = payload.get('sub')
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token: missing subject',
            )
        return {'id': user_id, 'email': payload.get('email'), 'role': payload.get('role')}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token has expired')
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid token: {e}')


def _fetch_profile(user_id: str) -> dict:
    """Fetch the user's profile row from Supabase (uses service role, bypasses RLS)."""
    client = get_supabase_client()
    result = client.table('profiles').select('*').eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Profile not found')
    return result.data[0]


async def get_current_user_with_profile(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Return the JWT user merged with their profile (includes role)."""
    user = await get_current_user(credentials)
    profile = _fetch_profile(user['id'])
    return {**user, 'profile_role': profile.get('role', 'guest'), 'display_name': profile.get('display_name')}


async def get_approved_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Only allows users with role 'approved' or 'admin'."""
    user = await get_current_user_with_profile(credentials)
    if user['profile_role'] not in ('approved', 'admin'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account pending approval')
    return user


async def get_admin_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Only allows users with role 'admin'."""
    user = await get_current_user_with_profile(credentials)
    if user['profile_role'] != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')
    return user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict | None:
    """Return user payload if a valid token is present, otherwise None."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
