import os
import subprocess
import sys


def test_headless_import_runtime():
    env = dict(os.environ)
    env["OMR_HEADLESS"] = "1"
    env.setdefault("PYTEST_DISABLE_PLUGIN_AUTOLOAD", "1")

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import api.main; import src.entry; print('ok')",
        ],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "ok" in result.stdout
