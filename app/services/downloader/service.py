"""
Serviço de download - stateless
Recebe dados, faz download e salva organizado
"""
import yt_dlp
import os
import logging
from typing import Optional
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class DownloaderService:
    def __init__(self):
        """Serviço stateless - não precisa de sessão de banco"""
        pass

    async def download_video(
        self,
        video_url: str,
        platform: str,
        external_video_id: str,
        group_name: Optional[str] = None,
        source_name: Optional[str] = None
    ):
        """
        Faz download de um vídeo
        Organiza por: downloads/{grupo}/{fonte}/{video_id}.mp4
        """
        # Organizar estrutura de pastas
        if group_name and source_name:
            group_folder = group_name.replace(" ", "_").lower()
            source_folder = source_name.replace(" ", "_").lower()
            download_dir = os.path.join(settings.LOCAL_STORAGE_PATH, group_folder, source_folder)
        else:
            download_dir = os.path.join(settings.LOCAL_STORAGE_PATH, platform)
        
        os.makedirs(download_dir, exist_ok=True)
        output_path = os.path.join(download_dir, f"{external_video_id}.mp4")

        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': output_path.replace('.mp4', '.%(ext)s'),
            'quiet': False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            logger.info(f"Downloaded: {output_path}")
            return {"status": "completed", "path": output_path}
        except Exception as e:
            logger.error(f"Download failed for {external_video_id}: {e}")
            return {"status": "failed", "error": str(e)}
