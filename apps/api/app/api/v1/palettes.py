from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import CharacterProfile, Palette, Project, User
from app.schemas.schemas import (
    CharacterProfileCreate,
    CharacterProfileResponse,
    PaletteCreate,
    PaletteResponse
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/palettes", tags=["Character & Palettes"])

@router.get("/projects/{project_id}/characters", response_model=List[CharacterProfileResponse])
def list_characters(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(CharacterProfile).filter(CharacterProfile.project_id == project_id).all()

@router.post("/projects/{project_id}/characters", response_model=CharacterProfileResponse, status_code=status.HTTP_201_CREATED)
def create_character(
    project_id: str,
    char_in: CharacterProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    char = CharacterProfile(
        project_id=project_id,
        name=char_in.name,
        notes=char_in.notes
    )
    db.add(char)
    db.commit()
    db.refresh(char)
    return char

@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_character(
    character_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    char = db.query(CharacterProfile).filter(CharacterProfile.id == character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    db.delete(char)
    db.commit()
    return None

@router.post("/projects/{project_id}/palettes", response_model=PaletteResponse, status_code=status.HTTP_201_CREATED)
def create_palette(
    project_id: str,
    palette_in: PaletteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    palette = Palette(
        project_id=project_id,
        character_id=palette_in.character_id,
        name=palette_in.name,
        hair_colors=palette_in.hair_colors,
        eye_colors=palette_in.eye_colors,
        skin_tones=palette_in.skin_tones,
        clothing_colors=palette_in.clothing_colors,
        accessories_colors=palette_in.accessories_colors,
        extra_colors=palette_in.extra_colors,
        is_default=palette_in.is_default
    )
    db.add(palette)
    db.commit()
    db.refresh(palette)
    return palette

@router.get("/projects/{project_id}/palettes", response_model=List[PaletteResponse])
def list_project_palettes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Palette).filter(Palette.project_id == project_id).all()

@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_palette(
    palette_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    palette = db.query(Palette).filter(Palette.id == palette_id).first()
    if not palette:
        raise HTTPException(status_code=404, detail="Palette not found")
    db.delete(palette)
    db.commit()
    return None
