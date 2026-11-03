from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "HENRICHED DIGITAL SERVICES"
    database_url: str = "sqlite:///./henriched.db"
    secret_key: str = "development-only-change-this-secret"
    admin_email: str = "admin@example.com"
    admin_password: str = "ChangeThisPassword123!"
    paystack_secret_key: str = ""
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
