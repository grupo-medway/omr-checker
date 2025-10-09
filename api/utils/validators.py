"""Input validation utilities for security and data integrity."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Set

# Path traversal patterns to block
DANGEROUS_PATH_PATTERNS = [
    "..",
    "~",
    "/etc",
    "/root",
    "/sys",
    "/proc",
]

# Valid answer values for OMR responses
VALID_ANSWER_VALUES: Set[str] = {"A", "B", "C", "D", "E", "", "UNMARKED"}

# XSS-prone characters to sanitize in user inputs
XSS_PATTERN = re.compile(r'[<>"\'/\\]')


def validate_batch_id(batch_id: str) -> bool:
    """
    Validate batch_id to prevent path traversal attacks.

    Args:
        batch_id: The batch identifier to validate

    Returns:
        True if valid, False otherwise
    """
    if not batch_id or not isinstance(batch_id, str):
        return False

    # Check for dangerous patterns
    batch_lower = batch_id.lower()
    if any(pattern in batch_lower for pattern in DANGEROUS_PATH_PATTERNS):
        return False

    # Only allow alphanumeric, hyphens, underscores
    if not re.match(r"^[a-zA-Z0-9_-]+$", batch_id):
        return False

    # Reasonable length limit
    if len(batch_id) > 128:
        return False

    return True


def validate_template_name(template: str) -> bool:
    """
    Validate template name to prevent path traversal.

    Args:
        template: The template name to validate

    Returns:
        True if valid, False otherwise
    """
    if not template or not isinstance(template, str):
        return False

    # Check for dangerous patterns
    template_lower = template.lower()
    if any(pattern in template_lower for pattern in DANGEROUS_PATH_PATTERNS):
        return False

    # Only allow alphanumeric, hyphens, underscores
    if not re.match(r"^[a-zA-Z0-9_-]+$", template):
        return False

    # Reasonable length limit
    if len(template) > 64:
        return False

    return True


def validate_file_id(file_id: str) -> bool:
    """
    Validate file_id to prevent path traversal.

    Args:
        file_id: The file identifier to validate

    Returns:
        True if valid, False otherwise
    """
    if not file_id or not isinstance(file_id, str):
        return False

    # Check for dangerous patterns
    file_lower = file_id.lower()
    if any(pattern in file_lower for pattern in DANGEROUS_PATH_PATTERNS):
        return False

    # Allow common filename patterns (alphanumeric + dot + common extensions)
    if not re.match(r"^[a-zA-Z0-9_.-]+$", file_id):
        return False

    # Reasonable length limit
    if len(file_id) > 256:
        return False

    return True


def validate_answer_value(value: str) -> bool:
    """
    Validate OMR answer value.

    Args:
        value: The answer value to validate

    Returns:
        True if valid, False otherwise
    """
    return value in VALID_ANSWER_VALUES


def sanitize_user_input(text: str, max_length: int = 256) -> str:
    """
    Sanitize user input to prevent XSS and other injection attacks.

    Args:
        text: The text to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized text
    """
    if not text or not isinstance(text, str):
        return ""

    # Truncate to max length
    text = text[:max_length]

    # Remove XSS-prone characters
    text = XSS_PATTERN.sub("", text)

    # Trim whitespace
    return text.strip()


def validate_audit_user(user: str) -> bool:
    """
    Validate X-Audit-User header value.

    Args:
        user: The user identifier to validate

    Returns:
        True if valid, False otherwise
    """
    if not user or not isinstance(user, str):
        return False

    # Check length first
    if len(user) > 64:
        return False

    # Only allow safe characters (before sanitization)
    if not re.match(r"^[a-zA-Z0-9@._-]+$", user):
        return False

    return True


def is_safe_path(path: Path, base_dir: Path) -> bool:
    """
    Verify that a path is within a base directory (no traversal).

    Args:
        path: The path to verify
        base_dir: The base directory that should contain the path

    Returns:
        True if path is safe, False otherwise
    """
    try:
        resolved_path = path.resolve()
        resolved_base = base_dir.resolve()
        return resolved_path.is_relative_to(resolved_base)
    except (ValueError, RuntimeError):
        return False
