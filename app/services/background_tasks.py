import asyncio
from sqlmodel import select
from uuid import UUID
from app.core.database import get_session
from app.services.fetcher.service import FetcherService
from app.models.job import Job
from app.models.group import Group
from app.models.source import Source
from app.models.content_item import ContentItem
# Import DownloaderService inside function to avoid circular imports if any, 
# but generally top level is fine if organized well.
from app.services.downloader.service import DownloaderService

# Helper to run sync in async context if needed, but Services here are async.
async def process_fetch_job(job_id: str):
    async for session in get_session():
        job = await session.get(Job, UUID(job_id))
        if not job:
            return
        
        job.status = "running"
        session.add(job)
        await session.commit()
        
        try:
            service = FetcherService(session)
            sources = await session.exec(select(Source).where(Source.status == "active"))
            for source in sources.all():
                await service.fetch_from_source(source)
            
            job.status = "completed"
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
        
        session.add(job)
        await session.commit()

async def process_download_job(job_id: str, content_item_id: str):
    async for session in get_session():
        job = await session.get(Job, UUID(job_id))
        if not job:
            return
        
        job.status = "running"
        session.add(job)
        await session.commit()
        
        try:
            service = DownloaderService(session)
            await service.download_item(UUID(content_item_id))
            
            job.status = "completed"
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
        
        session.add(job)
        await session.commit()

async def process_n8n_fetch_job(job_id: str):
    """
    Processa todos os grupos ativos, buscando vídeos de suas fontes.
    Organiza downloads por grupo/fonte.
    """
    async for session in get_session():
        job = await session.get(Job, UUID(job_id))
        if not job:
            return
        
        job.status = "running"
        session.add(job)
        await session.commit()
        
        try:
            fetcher_service = FetcherService(session)
            
            # Buscar todos os grupos ativos
            active_groups = await session.exec(
                select(Group).where(Group.status == "active")
            )
            
            # Para cada grupo, processar suas fontes
            for group in active_groups.all():
                # Buscar fontes ativas do grupo
                sources_in_group = await session.exec(
                    select(Source).where(
                        Source.group_id == group.id,
                        Source.status == "active"
                    )
                )
                
                # Processar cada fonte
                for source in sources_in_group.all():
                    await fetcher_service.fetch_from_source(source)
            
            job.status = "completed"
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
        
        session.add(job)
        await session.commit()
