from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token, get_password_hash
from app.models.entities import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Returns the authenticated user.
    In local development mode without token, creates/uses a default local user.
    In production mode, strictly validates the JWT token.
    """
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user and user.is_active:
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Local mode fallback
    if settings.APP_MODE == "local":
        local_user = db.query(User).filter(User.email == "local@bluebox.studio").first()
        if not local_user:
            local_user = User(
                email="local@bluebox.studio",
                hashed_password=get_password_hash("localpassword123"),
                full_name="Local Studio Artist",
                is_admin=True,
                is_active=True
            )
            db.add(local_user)
            db.commit()
            db.refresh(local_user)
        return local_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
