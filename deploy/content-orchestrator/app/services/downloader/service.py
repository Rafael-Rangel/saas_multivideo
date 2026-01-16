"""
Serviço de download usando yt-dlp (biblioteca Python)
Estratégia única e confiável para download de vídeos
"""
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

    def _sanitize_filename(self, filename: str, max_length: int = 200) -> str:
        """Limpa o nome do arquivo criando um slug: minúsculo, sem acentos, sem emojis, espaços viram underscores"""
        import re
        import unicodedata
        
        # Remover emojis e caracteres especiais
        # Remove emojis (Unicode ranges para emojis)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags (iOS)
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE
        )
        filename = emoji_pattern.sub('', filename)
        
        # Mapear caracteres especiais ANTES da normalização
        # Isso garante que caracteres como ª e º sejam convertidos antes de serem decompostos
        char_map = {
            '\u00AA': 'a',  # ª (ordinal feminino)
            '\u00BA': 'o',  # º (ordinal masculino)
            '\u00B0': 'o',  # ° (grau)
            '\u00E7': 'c',  # ç
            '\u00C7': 'c',  # Ç
            '\u00F1': 'n',  # ñ
            '\u00D1': 'n',  # Ñ
        }
        for old, new in char_map.items():
            filename = filename.replace(old, new)
        
        # Normalizar Unicode (NFD = Normalized Form Decomposed)
        # Isso separa acentos dos caracteres
        filename = unicodedata.normalize('NFD', filename)
        
        # Remover acentos (diacríticos) - categoria 'Mn' = Mark, Nonspacing
        filename = ''.join(
            char for char in filename 
            if unicodedata.category(char) != 'Mn'  # Remove acentos
        )
        
        # Agora manter apenas letras ASCII, números e alguns caracteres básicos
        filename = ''.join(
            char for char in filename 
            if (char.isascii() and char.isalnum()) or char in ' _-.'  # Mantém apenas ASCII alfanumérico
        )
        
        # Converter para minúsculas
        filename = filename.lower()
        
        # Remover caracteres inválidos para nome de arquivo
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        
        # Substituir espaços, hífens e pontos por underscore
        filename = re.sub(r'[\s\-_\.]+', '_', filename)
        
        # Remover underscores múltiplos
        filename = re.sub(r'_+', '_', filename)
        
        # Remover underscores no início e fim
        filename = filename.strip('_')
        
        # Limitar tamanho
        if len(filename) > max_length:
            filename = filename[:max_length].rstrip('_')
        
        # Se ficar vazio, usar um nome padrão
        if not filename:
            filename = "video"
        
        return filename

    async def _get_video_title(self, video_url: str) -> Optional[str]:
        """Busca o título do vídeo usando yt-dlp"""
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,  # Não baixar, só pegar info
            }
            
            # Tentar usar cookies se existirem
            cookies_path = os.path.join(settings.LOCAL_STORAGE_PATH, '..', 'data', 'cookies.txt')
            if os.path.exists(cookies_path):
                ydl_opts['cookiefile'] = cookies_path
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return info.get('title')
        except Exception as e:
            logger.warning(f"Could not get video title: {e}")
            return None

    async def download_video(
        self,
        video_url: str,
        platform: str,
        external_video_id: str,
        group_name: Optional[str] = None,
        source_name: Optional[str] = None
    ):
        """
        Faz download de um vídeo usando múltiplas estratégias
        Organiza por: downloads/{grupo}/{fonte}/{titulo_do_video}.mp4
        """
        # Organizar estrutura de pastas
        if group_name and source_name:
            group_folder = group_name.replace(" ", "_").lower()
            source_folder = source_name.replace(" ", "_").lower()
            download_dir = os.path.join(settings.LOCAL_STORAGE_PATH, group_folder, source_folder)
        else:
            download_dir = os.path.join(settings.LOCAL_STORAGE_PATH, platform)
        
        os.makedirs(download_dir, exist_ok=True)
        
        # Buscar título do vídeo
        video_title = await self._get_video_title(video_url)
        
        # Usar título se disponível, senão usar external_video_id
        if video_title:
            filename = self._sanitize_filename(video_title)
            output_path = os.path.join(download_dir, f"{filename}.mp4")
            logger.info(f"Using video title as filename: {filename}")
        else:
            # Fallback para external_video_id se não conseguir o título
            output_path = os.path.join(download_dir, f"{external_video_id}.mp4")
            logger.warning(f"Could not get video title, using external_video_id: {external_video_id}")

        # Verificar se arquivo já existe e está completo
        # Verificar tanto pelo nome do título quanto pelo video_id (caso já tenha sido baixado antes)
        existing_path = None
        if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
            existing_path = output_path
        else:
            # Verificar se existe com o nome antigo (video_id)
            old_path = os.path.join(download_dir, f"{external_video_id}.mp4")
            if os.path.exists(old_path) and os.path.getsize(old_path) > 1000:
                existing_path = old_path
        
        if existing_path:
            logger.info(f"File already exists: {existing_path} ({os.path.getsize(existing_path)} bytes)")
            return {"status": "completed", "path": existing_path}

        # Usar yt-dlp como biblioteca (única estratégia)
        try:
            logger.info(f"Downloading {external_video_id} with yt-dlp")
            result = await self._download_with_ytdlp_library(video_url, output_path)
            
            # Verificar se arquivo foi criado mesmo se status não for "completed"
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info(f"Download completed - file created ({os.path.getsize(output_path)} bytes)")
                return {"status": "completed", "path": output_path}
            
            if result.get('status') == 'completed':
                logger.info("Download completed successfully")
                return result
            else:
                logger.error(f"Download failed: {result.get('error')}")
                return result
        except Exception as e:
            logger.error(f"Download exception: {e}")
            # Verificar se arquivo foi criado mesmo com exceção
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info(f"File created despite exception ({os.path.getsize(output_path)} bytes)")
                return {"status": "completed", "path": output_path}
            return {"status": "failed", "error": f"Download failed: {str(e)}"}

    async def _download_with_ytdlp_library(self, video_url: str, output_path: str):
        """Estratégia 1: yt-dlp como biblioteca Python (MAIS CONFIÁVEL)"""
        try:
            import yt_dlp
            
            # Configurações do yt-dlp
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': output_path.replace('.mp4', '.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
            }
            
            # Tentar usar cookies se existirem
            cookies_path = os.path.join(settings.LOCAL_STORAGE_PATH, '..', 'data', 'cookies.txt')
            if os.path.exists(cookies_path):
                ydl_opts['cookiefile'] = cookies_path
                logger.info("Using cookies file")
            
            # Usar yt-dlp como biblioteca
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            
            # Verificar se arquivo foi criado
            if os.path.exists(output_path):
                return {"status": "completed", "path": output_path}
            
            # Procurar arquivo com extensão diferente
            base_path = output_path.replace('.mp4', '')
            for ext in ['.mp4', '.webm', '.mkv', '.m4a']:
                test_path = base_path + ext
                if os.path.exists(test_path):
                    # Se não for mp4, renomear para mp4
                    if ext != '.mp4':
                        os.rename(test_path, output_path)
                    return {"status": "completed", "path": output_path}
            
            return {"status": "failed", "error": "File not found after yt-dlp download"}
                
        except ImportError:
            return {"status": "failed", "error": "yt-dlp library not installed"}
        except Exception as e:
            logger.error(f"yt-dlp library error: {e}")
            return {"status": "failed", "error": f"yt-dlp error: {str(e)[:200]}"}

