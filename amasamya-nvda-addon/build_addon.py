#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build and packaging script for AMASAMYA NVDA Add-on.

Packages manifest.ini and addon contents into a properly formatted
.nvda-addon ZIP archive at dist/amasamya-nvda-addon-<version>.nvda-addon.

Usage:
    python build_addon.py
    python build_addon.py --install
"""

import os
import sys
import shutil
import zipfile
import py_compile
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
ADDON_DIR = os.path.join(SCRIPT_DIR, "addon")
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "manifest.ini")


def parse_manifest(manifest_path):
    info = {}
    with open(manifest_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                info[key] = val
    return info


def build_addon(install=False):
    if not os.path.exists(MANIFEST_PATH):
        print(f"Error: manifest.ini not found at {MANIFEST_PATH}")
        sys.exit(1)

    info = parse_manifest(MANIFEST_PATH)
    name = info.get("name", "amasamya")
    version = info.get("version", "0.2.11")
    print(f"Building NVDA Add-on: {name} v{version}")

    # Validate Python syntax of plugins
    plugin_path = os.path.join(ADDON_DIR, "globalPlugins", "amasamya.py")
    if os.path.exists(plugin_path):
        print(f"Compiling and checking syntax: {plugin_path}")
        try:
            py_compile.compile(plugin_path, doraise=True)
            print("Syntax check passed.")
        except Exception as e:
            print(f"Python syntax error in {plugin_path}: {e}")
            sys.exit(1)

    # Ensure doc/en/readme.html exists
    doc_dir = os.path.join(ADDON_DIR, "doc", "en")
    readme_md = os.path.join(doc_dir, "readme.md")
    readme_html = os.path.join(doc_dir, "readme.html")

    if not os.path.exists(readme_html) and os.path.exists(readme_md):
        print("Generating readme.html from readme.md...")
        # Basic markdown to HTML wrapper
        with open(readme_md, "r", encoding="utf-8") as f:
            md_text = f.read()
        html_body = re.sub(r"^# (.*?)$", r"<h1>\1</h1>", md_text, flags=re.MULTILINE)
        html_body = re.sub(r"^## (.*?)$", r"<h2>\1</h2>", html_body, flags=re.MULTILINE)
        html_body = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", html_body)
        html_body = re.sub(r"`(.*?)`", r"<code>\1</code>", html_body)
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AMASAMYA Accessibility Audit Companion for NVDA</title>
<style>
body {{ font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #222; }}
h1, h2 {{ color: #003366; }}
code {{ background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""
        with open(readme_html, "w", encoding="utf-8") as f:
            f.write(full_html)
        print("Generated readme.html successfully.")

    os.makedirs(DIST_DIR, exist_ok=True)
    out_filename = f"{name}-nvda-addon-{version}.nvda-addon"
    out_path = os.path.join(DIST_DIR, out_filename)

    # Also build canonical filename matching previous distribution
    canonical_filename = f"amasamya-nvda-addon-{version}.nvda-addon"
    canonical_path = os.path.join(DIST_DIR, canonical_filename)

    print(f"Packaging archive to: {canonical_path}")

    # Build ZIP archive
    with zipfile.ZipFile(canonical_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # manifest.ini at root
        zf.write(MANIFEST_PATH, arcname="manifest.ini")

        # Walk addon directory and write files without 'addon/' prefix
        for root, dirs, files in os.walk(ADDON_DIR):
            for file in files:
                if file.endswith(".pyc") or file.endswith(".pyo") or "__pycache__" in root:
                    continue
                file_full = os.path.join(root, file)
                rel_path = os.path.relpath(file_full, ADDON_DIR)
                # rel_path is e.g. "globalPlugins/amasamya.py" or "doc/en/readme.md"
                zf.write(file_full, arcname=rel_path)

    # Copy to project root (e.g. D:\AMASAMYA)
    root_addon_path = os.path.join(PROJECT_ROOT, canonical_filename)
    shutil.copyfile(canonical_path, root_addon_path)
    print(f"Copied package to root folder: {root_addon_path}")

    # Copy to Claude dist if available
    claude_dist = r"C:\Users\akhi_\Downloads\Claude\dist"
    if os.path.exists(claude_dist):
        try:
            shutil.copyfile(canonical_path, os.path.join(claude_dist, canonical_filename))
            print(f"Synced package to Claude dist: {claude_dist}")
        except Exception:
            pass

    # Copy to alternate name if different
    if out_path != canonical_path:
        shutil.copyfile(canonical_path, out_path)

    print(f"\nSuccessfully built add-on archive: {canonical_path}")
    print("Archive manifest and contents:")
    with zipfile.ZipFile(canonical_path, "r") as zf:
        for entry in zf.infolist():
            print(f"  - {entry.filename:<35} ({entry.file_size} bytes)")

    if install:
        appdata = os.environ.get("APPDATA")
        if appdata:
            nvda_addon_dest = os.path.join(appdata, "nvda", "addons", name)
            print(f"\nInstalling directly to NVDA configuration: {nvda_addon_dest}")
            os.makedirs(nvda_addon_dest, exist_ok=True)

            # Copy manifest
            shutil.copyfile(MANIFEST_PATH, os.path.join(nvda_addon_dest, "manifest.ini"))

            # Copy addon contents
            for root, dirs, files in os.walk(ADDON_DIR):
                for file in files:
                    if file.endswith(".pyc") or file.endswith(".pyo") or "__pycache__" in root:
                        continue
                    src_file = os.path.join(root, file)
                    rel_path = os.path.relpath(src_file, ADDON_DIR)
                    dst_file = os.path.join(nvda_addon_dest, rel_path)
                    os.makedirs(os.path.dirname(dst_file), exist_ok=True)
                    shutil.copyfile(src_file, dst_file)
            print("Direct installation completed! Restart NVDA (NVDA + Q, Enter) to load changes.")
        else:
            print("Could not locate %APPDATA% to install add-on.")

    return canonical_path


if __name__ == "__main__":
    do_install = "--install" in sys.argv
    build_addon(install=do_install)
