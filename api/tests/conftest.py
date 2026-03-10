import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("OMR_HEADLESS", "1")
os.environ.setdefault(
    "MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "omr-checker-tests-mpl")
)

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
