import json
import shutil
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path


class JobStoreError(Exception):
    pass


class JobStore:
    _CLEANUP_INTERVAL = 300  # seconds

    def __init__(self, root_dir: Path, ttl_seconds: int):
        self.root_dir = Path(root_dir)
        self.ttl_seconds = ttl_seconds
        self.root_dir.mkdir(parents=True, exist_ok=True)
        self._last_cleanup: float = 0.0

    def _maybe_cleanup(self):
        now = time.monotonic()
        if now - self._last_cleanup > self._CLEANUP_INTERVAL:
            self.cleanup_expired_jobs()
            self._last_cleanup = now

    def cleanup_expired_jobs(self):
        now = datetime.now(timezone.utc)
        for job_dir in self.root_dir.iterdir():
            if not job_dir.is_dir():
                continue
            if self._is_expired(job_dir, now=now):
                shutil.rmtree(job_dir, ignore_errors=True)

    def create_job_dir(self, job_id: str) -> Path:
        self._maybe_cleanup()
        job_dir = self.root_dir / job_id
        workspace = job_dir / "workspace"
        workspace.mkdir(parents=True, exist_ok=False)
        return job_dir

    def get_job_path(self, job_id: str) -> Path:
        return self.root_dir / job_id

    def get_workspace_path(self, job_id: str) -> Path:
        return self.get_job_path(job_id) / "workspace"

    def get_document_path(self, job_id: str) -> Path:
        return self.get_job_path(job_id) / "job.json"

    def delete_job(self, job_id: str):
        job_path = self.get_job_path(job_id)
        try:
            resolved = job_path.resolve(strict=False)
            root_resolved = self.root_dir.resolve(strict=False)
        except FileNotFoundError:
            return
        if resolved == root_resolved or root_resolved not in resolved.parents:
            return
        shutil.rmtree(resolved, ignore_errors=True)

    def save_job(self, job_id: str, job_document: dict):
        document_path = self.get_document_path(job_id)
        document_path.write_text(json.dumps(job_document, indent=2, sort_keys=True), encoding="utf-8")

    def load_job(self, job_id: str) -> dict:
        job_path = self.get_job_path(job_id)
        if self._is_expired(job_path):
            shutil.rmtree(job_path, ignore_errors=True)
            raise JobStoreError(f"Job '{job_id}' not found")
        document_path = self.get_document_path(job_id)
        try:
            return json.loads(document_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            raise JobStoreError(f"Job '{job_id}' not found")

    def _is_expired(self, job_path: Path, now: datetime | None = None) -> bool:
        if now is None:
            now = datetime.now(timezone.utc)
        try:
            modified = datetime.fromtimestamp(job_path.stat().st_mtime, tz=timezone.utc)
        except FileNotFoundError:
            return False
        return now - modified > timedelta(seconds=self.ttl_seconds)

    def cleanup_workspace(self, path: Path):
        temp_root = Path(tempfile.gettempdir())
        try:
            resolved = path.resolve()
        except FileNotFoundError:
            return
        if temp_root in resolved.parents:
            shutil.rmtree(resolved, ignore_errors=True)
