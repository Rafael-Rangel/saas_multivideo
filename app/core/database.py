import logging
from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Use async engine
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

async def init_db():
    """
    Inicializa o banco de dados. Não bloqueia o startup se falhar.
    """
    try:
        async with engine.begin() as conn:
            # await conn.run_sync(SQLModel.metadata.drop_all)
            await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization failed (will retry on first request): {e}")
        # Não levanta exceção para não bloquear o startup
