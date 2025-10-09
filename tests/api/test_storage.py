from api.utils.storage import ensure_storage_dirs, reset_storage


def test_storage_helpers_manage_directories(audit_env):
    settings, _ = audit_env

    ensure_storage_dirs(settings)

    storage_dirs = [
        settings.processing_dir,
        settings.results_dir,
        settings.exports_dir,
        settings.static_root,
        settings.temp_root,
    ]

    for directory in storage_dirs:
        assert directory.exists()

    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    settings.database_path.write_text("dummy")

    reset_storage(settings, drop_db=True)

    for directory in storage_dirs:
        assert directory.exists()
        assert not any(directory.iterdir())

    assert not settings.database_path.exists()
