import os
import base64
import binascii
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


bearer_scheme = HTTPBearer(auto_error=False)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be configured with at least 32 characters")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
LEGACY_PASSWORD_SALT = os.getenv("PASSWORD_SALT", "employee-app-salt")
PASSWORD_HASH_PREFIX = "$scrypt$"
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return (
        f"{PASSWORD_HASH_PREFIX}{SCRYPT_N}${SCRYPT_R}${SCRYPT_P}$"
        f"{base64.urlsafe_b64encode(salt).decode()}$"
        f"{base64.urlsafe_b64encode(digest).decode()}"
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(PASSWORD_HASH_PREFIX):
        try:
            _, _, n, r, p, encoded_salt, encoded_digest = hashed_password.split("$")
            digest = hashlib.scrypt(
                plain_password.encode("utf-8"),
                salt=base64.urlsafe_b64decode(encoded_salt.encode()),
                n=int(n),
                r=int(r),
                p=int(p),
                dklen=len(base64.urlsafe_b64decode(encoded_digest.encode())),
            )
            return hmac.compare_digest(digest, base64.urlsafe_b64decode(encoded_digest.encode()))
        except (ValueError, TypeError, binascii.Error):
            return False

    legacy_digest = hashlib.sha256(f"{LEGACY_PASSWORD_SALT}:{plain_password}".encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_digest, hashed_password)


def is_legacy_password_hash(hashed_password: str) -> bool:
    return not hashed_password.startswith(PASSWORD_HASH_PREFIX)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "ver": user.token_version,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", "0"))
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if payload.get("ver", 0) != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return user
