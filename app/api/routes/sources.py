"""
Endpoints para sources - simplificado
Dados gerenciados via Google Sheets no n8n
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def list_sources():
    """
    Lista sources - dados devem vir do n8n/Google Sheets
    """
    return {
        "message": "Sources are managed via Google Sheets in n8n",
        "sources": []
    }

@router.post("")
async def create_source():
    """Cria source - use Google Sheets no n8n"""
    return {
        "message": "Sources should be created in Google Sheets via n8n"
    }
