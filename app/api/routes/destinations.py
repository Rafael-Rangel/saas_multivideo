"""
Endpoints para destinations - simplificado
Dados gerenciados via Google Sheets no n8n
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def list_destinations():
    """
    Lista destinations - dados devem vir do n8n/Google Sheets
    """
    return {
        "message": "Destinations are managed via Google Sheets in n8n",
        "destinations": []
    }

@router.post("")
async def create_destination():
    """Cria destination - use Google Sheets no n8n"""
    return {
        "message": "Destinations should be created in Google Sheets via n8n"
    }
