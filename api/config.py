import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple


@dataclass(frozen=True)
class Settings:
    api_token: str
    jobs_root: Path
    jobs_ttl_seconds: int
    max_upload_bytes: int
    max_uncompressed_bytes: int
    max_images_per_job: int
    allowed_extensions: Tuple[str, ...]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.api_token)


def get_settings() -> Settings:
    max_upload_bytes = int(os.environ.get("OMR_MAX_UPLOAD_BYTES", str(1024 * 1024 * 1024)))
    jobs_root = Path(
        os.environ.get(
            "OMR_JOB_STORAGE_DIR",
            os.path.join(tempfile.gettempdir(), "omr-checker-jobs"),
        )
    )
    return Settings(
        api_token=os.environ.get("OMR_API_TOKEN", "").strip(),
        jobs_root=jobs_root,
        jobs_ttl_seconds=int(os.environ.get("OMR_JOB_TTL_SECONDS", "86400")),
        max_upload_bytes=max_upload_bytes,
        max_uncompressed_bytes=int(
            os.environ.get("OMR_MAX_UNCOMPRESSED_BYTES", str(max_upload_bytes * 4))
        ),
        max_images_per_job=int(os.environ.get("OMR_MAX_IMAGES_PER_JOB", "50")),
        allowed_extensions=(".png", ".jpg", ".jpeg"),
    )
