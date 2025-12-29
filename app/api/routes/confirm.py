"""
Endpoint de confirmação de publicação - simplificado (stateless)
Apenas retorna confirmação, histórico gerenciado no n8n/Google Sheets
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ConfirmPublishRequest(BaseModel):
    """Request para confirmar publicação"""
    video_id: str
    destination_platform: str
    destination_account_id: str
    result: str  # success, error
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None

@router.post("")
async def confirm_publish(request: ConfirmPublishRequest):
    """
    Confirma publicação de um vídeo
    Retorna confirmação - histórico deve ser salvo no n8n/Google Sheets
    """
    return {
        "status": "confirmed",
        "message": f"Publish {request.result} confirmed for video {request.video_id}",
        "data": {
            "video_id": request.video_id,
            "destination": f"{request.destination_platform}/{request.destination_account_id}",
            "result": request.result,
            "platform_post_id": request.platform_post_id,
            "error_message": request.error_message
        }
    }
