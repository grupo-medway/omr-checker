"""Tests for input validation utilities."""

from __future__ import annotations

from pathlib import Path

import pytest

from api.utils.validators import (
    is_safe_path,
    sanitize_user_input,
    validate_answer_value,
    validate_audit_user,
    validate_batch_id,
    validate_file_id,
    validate_template_name,
)


class TestValidateBatchId:
    """Test batch_id validation."""

    def test_valid_batch_ids(self):
        assert validate_batch_id("batch-123")
        assert validate_batch_id("test_batch_456")
        assert validate_batch_id("abc123-def456")
        assert validate_batch_id("BATCH_001")

    def test_rejects_path_traversal(self):
        assert not validate_batch_id("../etc/passwd")
        assert not validate_batch_id("../../sensitive")
        assert not validate_batch_id("~/secrets")
        assert not validate_batch_id("/etc/shadow")
        assert not validate_batch_id("batch/../other")

    def test_rejects_special_characters(self):
        assert not validate_batch_id("batch;rm -rf")
        assert not validate_batch_id("batch<script>")
        assert not validate_batch_id("batch|cat")
        assert not validate_batch_id("batch&whoami")

    def test_rejects_empty_or_invalid_types(self):
        assert not validate_batch_id("")
        assert not validate_batch_id(None)  # type: ignore

    def test_rejects_too_long(self):
        assert not validate_batch_id("a" * 129)


class TestValidateTemplateName:
    """Test template name validation."""

    def test_valid_template_names(self):
        assert validate_template_name("evolucional-dia1")
        assert validate_template_name("template_01")
        assert validate_template_name("SOMOS-2025")

    def test_rejects_path_traversal(self):
        assert not validate_template_name("../etc/passwd")
        assert not validate_template_name("../../sensitive")
        assert not validate_template_name("~/config")

    def test_rejects_special_characters(self):
        assert not validate_template_name("template/config")
        assert not validate_template_name("template<>")
        assert not validate_template_name("template;ls")

    def test_rejects_empty_or_invalid_types(self):
        assert not validate_template_name("")
        assert not validate_template_name(None)  # type: ignore

    def test_rejects_too_long(self):
        assert not validate_template_name("a" * 65)


class TestValidateFileId:
    """Test file_id validation."""

    def test_valid_file_ids(self):
        assert validate_file_id("file1.jpg")
        assert validate_file_id("cartao_123.png")
        assert validate_file_id("IMG-2025-01-01.jpeg")
        assert validate_file_id("scan.tiff")

    def test_rejects_path_traversal(self):
        assert not validate_file_id("../etc/passwd")
        assert not validate_file_id("../../sensitive.jpg")
        assert not validate_file_id("~/file.png")

    def test_rejects_dangerous_patterns(self):
        assert not validate_file_id("/etc/shadow")
        assert not validate_file_id("/root/file.jpg")

    def test_rejects_empty_or_invalid_types(self):
        assert not validate_file_id("")
        assert not validate_file_id(None)  # type: ignore

    def test_rejects_too_long(self):
        assert not validate_file_id("a" * 257)


class TestValidateAnswerValue:
    """Test OMR answer value validation."""

    def test_valid_answers(self):
        assert validate_answer_value("A")
        assert validate_answer_value("B")
        assert validate_answer_value("C")
        assert validate_answer_value("D")
        assert validate_answer_value("E")
        assert validate_answer_value("")
        assert validate_answer_value("UNMARKED")

    def test_rejects_invalid_answers(self):
        assert not validate_answer_value("F")
        assert not validate_answer_value("AB")
        assert not validate_answer_value("a")
        assert not validate_answer_value("1")
        assert not validate_answer_value("INVALID")
        assert not validate_answer_value("X")


class TestSanitizeUserInput:
    """Test user input sanitization."""

    def test_removes_xss_characters(self):
        assert sanitize_user_input("hello<script>") == "helloscript"
        assert sanitize_user_input('test"value') == "testvalue"
        assert sanitize_user_input("path/to/file") == "pathtofile"
        assert sanitize_user_input("test\\escape") == "testescape"

    def test_truncates_long_input(self):
        long_text = "a" * 300
        result = sanitize_user_input(long_text, max_length=50)
        assert len(result) == 50

    def test_trims_whitespace(self):
        assert sanitize_user_input("  test  ") == "test"
        assert sanitize_user_input("\n\tvalue\t\n") == "value"

    def test_handles_empty_or_none(self):
        assert sanitize_user_input("") == ""
        assert sanitize_user_input(None) == ""  # type: ignore


class TestValidateAuditUser:
    """Test X-Audit-User header validation."""

    def test_valid_users(self):
        assert validate_audit_user("auditor@sala1")
        assert validate_audit_user("user_123")
        assert validate_audit_user("professor.silva")
        assert validate_audit_user("admin-01")

    def test_rejects_xss_attempts(self):
        assert not validate_audit_user("user<script>")
        assert not validate_audit_user("admin' OR '1'='1")
        assert not validate_audit_user("user;drop table")

    def test_rejects_empty_or_invalid_types(self):
        assert not validate_audit_user("")
        assert not validate_audit_user("   ")
        assert not validate_audit_user(None)  # type: ignore

    def test_rejects_too_long(self):
        assert not validate_audit_user("a" * 100)


class TestIsSafePath:
    """Test safe path verification."""

    def test_allows_paths_within_base(self, tmp_path):
        base = tmp_path / "storage"
        base.mkdir()

        safe_path = base / "batch-1" / "file.jpg"
        assert is_safe_path(safe_path, base)

        nested = base / "a" / "b" / "c" / "file.txt"
        assert is_safe_path(nested, base)

    def test_rejects_paths_outside_base(self, tmp_path):
        base = tmp_path / "storage"
        base.mkdir()

        outside = tmp_path / "outside" / "file.txt"
        assert not is_safe_path(outside, base)

    def test_rejects_traversal_attempts(self, tmp_path):
        base = tmp_path / "storage"
        base.mkdir()

        traversal = base / ".." / ".." / "etc" / "passwd"
        assert not is_safe_path(traversal, base)
