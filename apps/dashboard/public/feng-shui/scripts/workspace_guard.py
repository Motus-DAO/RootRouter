#!/usr/bin/env python3
"""Check whether an agent's intended working directory is safe for writes."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=Path, default=Path.cwd(), help="Working directory to evaluate")
    parser.add_argument("--intent", choices=("inspect", "write"), default="write")
    parser.add_argument("--allowed-root", action="append", default=[], type=Path)
    parser.add_argument("--home", type=Path, default=Path.home())
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of a compact text result")
    return parser.parse_args()


def contains(root: Path, candidate: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def find_git_root(path: Path) -> Path | None:
    current = path if path.is_dir() else path.parent
    for candidate in (current, *current.parents):
        if (candidate / ".git").exists():
            return candidate
    return None


def evaluate(path: Path, home: Path, allowed_roots: list[Path], intent: str) -> dict[str, str | None]:
    path = path.expanduser().resolve()
    home = home.expanduser().resolve()
    allowed = [item.expanduser().resolve() for item in allowed_roots]

    if intent == "inspect":
        return {"status": "allowed", "path": str(path), "reason": "read-only inspection", "suggested_path": None}

    for root in allowed:
        if contains(root, path):
            return {"status": "allowed", "path": str(path), "reason": f"inside approved root {root}", "suggested_path": None}

    projects_root = home / "Projects"
    temp_roots = {Path("/tmp").resolve(), Path(tempfile.gettempdir()).resolve()}
    if contains(projects_root, path) or any(contains(root, path) for root in temp_roots):
        return {"status": "allowed", "path": str(path), "reason": "inside a standard project or temporary root", "suggested_path": None}

    protected_system_roots = tuple(Path(item).resolve() for item in ("/System", "/Library", "/bin", "/sbin", "/usr", "/etc", "/var"))
    if path == Path("/") or any(contains(root, path) for root in protected_system_roots):
        return {"status": "blocked", "path": str(path), "reason": "system location", "suggested_path": str(projects_root)}

    protected_home_roots = (home / "Desktop", home / "Downloads", home / "Library")
    if path == home or any(contains(root, path) for root in protected_home_roots):
        return {"status": "blocked", "path": str(path), "reason": "home root or transient/protected home location", "suggested_path": str(projects_root)}

    git_root = find_git_root(path)
    if git_root is not None:
        if git_root.parent == home:
            return {"status": "review", "path": str(path), "reason": "legacy repository directly under home", "suggested_path": str(projects_root)}
        return {"status": "allowed", "path": str(path), "reason": f"inside existing repository {git_root}", "suggested_path": None}

    if path.parent == home:
        return {"status": "review", "path": str(path), "reason": "unapproved top-level home directory", "suggested_path": str(projects_root)}

    return {"status": "review", "path": str(path), "reason": "directory is not an approved workspace or recognized repository", "suggested_path": str(projects_root)}


def main() -> int:
    args = parse_args()
    result = evaluate(args.path, args.home, args.allowed_root, args.intent)
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(f"{result['status']}|{result['reason']}|{result['path']}")
        if result["suggested_path"]:
            print(f"suggested|{result['suggested_path']}")
    return {"allowed": 0, "blocked": 2, "review": 3}[str(result["status"])]


if __name__ == "__main__":
    raise SystemExit(main())
