from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SecAgent Hub API"
    algorand_network: str = "testnet"
    algod_node_url: str = ""
    algod_token: str = ""
    indexer_url: str = ""
    usdc_asa_id: int = 10458941  # TestNet USDC ASA ID — overridden by USDC_ASA_ID env var
    facilitator_address: str = "PT6VVN7OZ3TVISZ6C6AMQKS2LFLKPI5FFY5L5WCMZO4WKCIZL735ZNUWXU"
    facilitator_mnemonic: str = ""
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""
    allow_mock_payments: bool = True
    internal_api_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
