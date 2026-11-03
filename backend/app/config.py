from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "HENRICHED DIGITAL SERVICES"
    database_url: str = "sqlite:///./henriched.db"
    secret_key: str = "development-only-change-this-secret"
    admin_email: str = "admin@example.com"
    admin_password: str = ""
    paystack_secret_key: str = ""
    frontend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:8000"
    whatsapp_number: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
