import os
from dataclasses import dataclass


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    # Shared secret between the Next.js app and this service (both directions).
    service_token: str
    # Where finished analyses are POSTed back to (the Next.js internal route).
    callback_url: str
    # Only files hosted here are downloaded — prevents the service being used
    # to fetch arbitrary URLs (SSRF).
    allowed_file_host: str
    model: str
    max_file_bytes: int
    max_concurrent_jobs: int


def load_settings() -> Settings:
    return Settings(
        service_token=_required("SERVICE_TOKEN"),
        callback_url=_required("CALLBACK_URL"),
        allowed_file_host=_required("ALLOWED_FILE_HOST"),
        model=os.environ.get("CLAUDE_MODEL", "claude-opus-5-5"),
        max_file_bytes=int(os.environ.get("MAX_FILE_MB", "30")) * 1024 * 1024,
        max_concurrent_jobs=int(os.environ.get("MAX_CONCURRENT_JOBS", "3")),
    )
