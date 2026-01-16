from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Content Orchestrator"
    API_V1_STR: str = "/v1"
    
    # Storage (local apenas - dados gerenciados via Google Sheets no n8n)
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_PATH: str = "downloads"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignora variáveis extras (como SUPABASE_URL, etc)

@lru_cache()
def get_settings():
    return Settings()
