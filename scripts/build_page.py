#!/usr/bin/env python3
"""Rebuild index.html from src/template.html and data/sitemap.json.

Usage (from the repo root):
    python3 scripts/build_page.py
"""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "src" / "template.html"
DATA = ROOT / "data" / "sitemap.json"
OUT = ROOT / "index.html"


def compact(node):
    """Drop fields the page doesn't use and empty values to keep index.html small."""
    for key in ("updated_iso", "depth"):
        node.pop(key, None)
    for link in node.get("outbound", []):
        for key in list(link):
            if not link[key] and key != "text":
                link.pop(key)
    for child in node.get("children", []):
        compact(child)


def main():
    data = copy.deepcopy(json.loads(DATA.read_text(encoding="utf-8")))
    compact(data["tree"])
    embedded = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    # Keep a literal "</script>" in any string from ending the inline script early.
    embedded = embedded.replace("</", "<\\/")

    template = TEMPLATE.read_text(encoding="utf-8")
    if "__DATA__" not in template:
        raise SystemExit("src/template.html is missing the __DATA__ placeholder")

    # The template holds <title>, <link>, <style> and then the body content.
    split_at = template.index("</style>") + len("</style>")
    head, body = template[:split_at], template[split_at:]
    page = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        f"{head}\n</head>\n<body>{body.replace('__DATA__', embedded)}\n</body>\n</html>\n"
    )
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(page):,} bytes)")


if __name__ == "__main__":
    main()
