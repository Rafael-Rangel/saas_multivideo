"""
Endpoint de download - stateless
Recebe dados do vídeo e faz download
"""
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.services.downloader.service import DownloaderService

router = APIRouter()

class DownloadRequest(BaseModel):
    """Request para download"""
    video_url: str
    platform: str
    external_video_id: str
    group_name: Optional[str] = None
    source_name: Optional[str] = None

@router.post("")
async def download_content(
    request: DownloadRequest,
    background_tasks: BackgroundTasks
):
    """
    Faz download de um vídeo
    Organiza por grupo/fonte se fornecido
    """
    downloader = DownloaderService()
    
    # Executar em background
    background_tasks.add_task(
        downloader.download_video,
        video_url=request.video_url,
        platform=request.platform,
        external_video_id=request.external_video_id,
        group_name=request.group_name,
        source_name=request.source_name
    )
    
    return {
        "status": "queued",
        "message": f"Download iniciado para {request.external_video_id}"
    }
