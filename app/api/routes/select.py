"""
Endpoint de seleção - simplificado (stateless)
Recebe dados do n8n e retorna conteúdo disponível
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class SelectRequest(BaseModel):
    """Request para selecionar conteúdo"""
    destination_platform: str
    destination_account_id: str
    group_name: Optional[str] = None
    # Dados de vídeos disponíveis vêm do n8n/Google Sheets
    available_videos: List[dict]

@router.post("")
async def select_content(request: SelectRequest):
    """
    Seleciona conteúdo baseado em regras simples
    Retorna vídeo selecionado ou None
    """
    # Lógica simples: retorna primeiro vídeo disponível
    # n8n pode implementar lógica mais complexa
    if not request.available_videos:
        return {"message": "No content available", "selected": None}
    
    # Filtrar por grupo se fornecido
    filtered = request.available_videos
    if request.group_name:
        filtered = [v for v in filtered if v.get("group_name") == request.group_name]
    
    if not filtered:
        return {"message": "No content available for this group", "selected": None}
    
    # Retornar primeiro disponível
    selected = filtered[0]
    return {
        "message": "Content selected",
        "selected": selected
    }
