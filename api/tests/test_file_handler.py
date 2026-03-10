import io
import zipfile

import pytest

from api.utils.file_handler import FileHandler


def _build_zip(entries: list[tuple[str, bytes]]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries:
            archive.writestr(name, content)
    return buffer.getvalue()


def test_extract_zip_rejects_duplicate_basenames(tmp_path):
    zip_content = _build_zip(
        [
            ("folder-a/scan.png", b"first"),
            ("folder-b/scan.png", b"second"),
        ]
    )

    with pytest.raises(ValueError, match="duplicate image filename"):
        FileHandler.extract_zip(
            zip_content,
            str(tmp_path),
            allowed_extensions=(".png", ".jpg", ".jpeg"),
            max_files=10,
            max_upload_bytes=1024 * 1024,
            max_uncompressed_bytes=1024 * 1024,
        )


def test_extract_zip_rejects_reserved_template_asset_names(tmp_path):
    zip_content = _build_zip([("nested/omr_marker.jpg", b"marker")])

    with pytest.raises(ValueError, match="reserved template asset"):
        FileHandler.extract_zip(
            zip_content,
            str(tmp_path),
            allowed_extensions=(".png", ".jpg", ".jpeg"),
            max_files=10,
            max_upload_bytes=1024 * 1024,
            max_uncompressed_bytes=1024 * 1024,
        )


def test_extract_zip_rejects_excessive_uncompressed_size(tmp_path):
    zip_content = _build_zip([("scan.png", b"a" * 4096)])
    assert len(zip_content) < 4096

    with pytest.raises(ValueError, match="uncompressed size"):
        FileHandler.extract_zip(
            zip_content,
            str(tmp_path),
            allowed_extensions=(".png", ".jpg", ".jpeg"),
            max_files=10,
            max_upload_bytes=1024 * 1024,
            max_uncompressed_bytes=1024,
        )
