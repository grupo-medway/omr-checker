import json
import os
import time
from pathlib import Path

import pytest

from api.job_store import JobStore, JobStoreError


def test_load_job_removes_expired_job(tmp_path):
    store = JobStore(tmp_path, ttl_seconds=1)
    job_id = "expired-job"
    job_dir = tmp_path / job_id
    workspace = job_dir / "workspace"
    workspace.mkdir(parents=True)
    (job_dir / "job.json").write_text(json.dumps({"job_id": job_id}), encoding="utf-8")

    old_timestamp = time.time() - 10
    os.utime(job_dir, (old_timestamp, old_timestamp))
    os.utime(job_dir / "job.json", (old_timestamp, old_timestamp))

    with pytest.raises(JobStoreError):
        store.load_job(job_id)

    assert not job_dir.exists()
