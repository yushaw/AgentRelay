#!/usr/bin/env python3
"""
Bootstrap a Windows CPython embedded runtime with project dependencies.

This script downloads the official CPython 3.12 x64 embedded distribution,
prepares site-packages with Windows wheels for the required dependencies,
and stages everything under `python-runtime/dist/`.

Run from repository root:

    python scripts/bootstrap_python_runtime.py
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PYTHON_RUNTIME = REPO_ROOT / "python-runtime"
DIST_DIR = PYTHON_RUNTIME / "dist"
CACHE_DIR = PYTHON_RUNTIME / ".cache"
EMBED_VERSION = "3.12.9"
EMBED_MAJOR, EMBED_MINOR, *_ = EMBED_VERSION.split(".")
EMBED_VERSION_SHORT = f"{EMBED_MAJOR}{EMBED_MINOR}"
EMBED_STEM = f"python-{EMBED_VERSION}-embed-amd64.zip"
EMBED_URL = f"https://www.python.org/ftp/python/{EMBED_VERSION}/{EMBED_STEM}"
EMBED_ARCHIVE = CACHE_DIR / EMBED_STEM
REQUIREMENTS_FILE = PYTHON_RUNTIME / "requirements.txt"


def download_embed() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if EMBED_ARCHIVE.exists():
        return
    import urllib.request

    print(f"Downloading CPython embed package from {EMBED_URL} ...")
    with urllib.request.urlopen(EMBED_URL) as response:
        data = response.read()
    EMBED_ARCHIVE.write_bytes(data)
    print(f"Saved embed package to {EMBED_ARCHIVE}")


def extract_embed() -> None:
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(EMBED_ARCHIVE, "r") as zf:
        zf.extractall(DIST_DIR)
    pth_file = DIST_DIR / f"python{EMBED_VERSION_SHORT}._pth"
    if pth_file.exists():
        content = pth_file.read_text(encoding="utf-8").splitlines()
        if ".\\Lib\\site-packages" not in content:
            content.append(".\\Lib\\site-packages")
        if "import site" not in content:
            content.append("import site")
        pth_file.write_text("\n".join(content) + "\n", encoding="utf-8")
    # Ensure Lib/site-packages exists
    site_packages = DIST_DIR / "Lib" / "site-packages"
    site_packages.mkdir(parents=True, exist_ok=True)
    print(f"Extracted embed runtime to {DIST_DIR}")


def install_requirements() -> None:
    wheels_dir = CACHE_DIR / "wheels"
    if wheels_dir.exists():
        shutil.rmtree(wheels_dir)
    wheels_dir.mkdir(parents=True, exist_ok=True)

    print("Downloading Windows wheels for requirements...")
    pip_args = [
        sys.executable,
        "-m",
        "pip",
        "download",
        "-r",
        str(REQUIREMENTS_FILE),
        "--dest",
        str(wheels_dir),
        "--platform",
        "win_amd64",
        "--python-version",
        EMBED_VERSION_SHORT,
        "--implementation",
        "cp",
        "--abi",
        f"cp{EMBED_VERSION_SHORT}",
        "--only-binary=:all:",
    ]
    subprocess.run(pip_args, check=True)

    site_packages = DIST_DIR / "Lib" / "site-packages"
    print(f"Extracting wheels into {site_packages} ...")
    for wheel in wheels_dir.glob("*.whl"):
        with zipfile.ZipFile(wheel, "r") as zf:
            zf.extractall(site_packages)

    # Clean pip metadata caches
    for dist_info in site_packages.glob("*.dist-info/RECORD"):
        pass  # keep metadata for compliance
    print("Dependencies unpacked.")


def copy_agentrelay_package() -> None:
    src = PYTHON_RUNTIME / "agentrelay"
    dest = DIST_DIR / "Lib" / "site-packages" / "agentrelay"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest)
    print(f"Copied agentrelay package to {dest}")


def copy_entrypoint() -> None:
    entrypoint_src = PYTHON_RUNTIME / "entrypoint.py"
    entrypoint_dst = DIST_DIR / "entrypoint.py"
    shutil.copy2(entrypoint_src, entrypoint_dst)
    print(f"Copied entrypoint to {entrypoint_dst}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare embedded Python runtime.")
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Do not fetch embed package if already staged.",
    )
    args = parser.parse_args()

    if not args.skip_download or not EMBED_ARCHIVE.exists():
        download_embed()

    extract_embed()
    install_requirements()
    copy_agentrelay_package()
    copy_entrypoint()

    print("Python runtime staging complete.")


if __name__ == "__main__":
    main()
