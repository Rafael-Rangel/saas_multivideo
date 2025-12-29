"""
Endpoints para grupos - simplificado
Dados gerenciados via Google Sheets no n8n
Estes endpoints são apenas informativos
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def list_groups():
    """
    Lista grupos - dados devem vir do n8n/Google Sheets
    """
    return {
        "message": "Groups are managed via Google Sheets in n8n",
        "groups": []
    }

@router.post("")
async def create_group():
    """Cria grupo - use Google Sheets no n8n"""
    return {
        "message": "Groups should be created in Google Sheets via n8n"
    }
