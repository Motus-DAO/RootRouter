#!/usr/bin/env python3
"""Produce a bounded, read-only JSON inventory of a directory."""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path


SKIP_DIRECTORIES = {
    ".git",
    ".gnupg",
    ".ssh",
    ".venv",
    "Library",
    "Mail",
    "node_modules",
    "venv",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path, help="Directory to inventory")
    parser.add_argument("--max-depth", type=int, default=2, help="Maximum depth below target (default: 2)")
    parser.add_argument("--include-hidden", action="store_true", help="Include hidden entries; sensitive skip rules still apply")
    parser.add_argument("--sample-limit", type=int, default=200, help="Maximum paths included in the sample")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target = args.target.expanduser().resolve()
    if not target.is_dir():
        raise SystemExit(f"Not a directory: {target}")
    if args.max_depth < 0 or args.sample_limit < 0:
        raise SystemExit("--max-depth and --sample-limit must be non-negative")

    counts = Counter()
    extensions = Counter()
    total_bytes = 0
    sample: list[dict[str, object]] = []
    skipped: list[str] = []

    for root, dirnames, filenames in os.walk(target, topdown=True, followlinks=False):
        root_path = Path(root)
        depth = len(root_path.relative_to(target).parts)

        allowed_dirs = []
        for dirname in sorted(dirnames):
            path = root_path / dirname
            if dirname in SKIP_DIRECTORIES or (dirname.startswith(".") and not args.include_hidden):
                skipped.append(str(path))
            elif depth < args.max_depth:
                allowed_dirs.append(dirname)
        dirnames[:] = allowed_dirs

        counts["directories"] += len(allowed_dirs)
        for filename in sorted(filenames):
            if filename.startswith(".") and not args.include_hidden:
                continue
            path = root_path / filename
            try:
                stat = path.lstat()
            except OSError:
                counts["unreadable"] += 1
                continue
            kind = "symlink" if path.is_symlink() else "file"
            counts[kind + "s"] += 1
            size = stat.st_size if kind == "file" else 0
            total_bytes += size
            suffix = path.suffix.lower() or "[no extension]"
            extensions[suffix] += 1
            if len(sample) < args.sample_limit:
                sample.append(
                    {
                        "path": str(path.relative_to(target)),
                        "kind": kind,
                        "size_bytes": size,
                        "modified_epoch": int(stat.st_mtime),
                    }
                )

    report = {
        "target": str(target),
        "limits": {
            "max_depth": args.max_depth,
            "include_hidden": args.include_hidden,
            "sample_limit": args.sample_limit,
            "content_read": False,
            "hashes_computed": False,
        },
        "counts": dict(counts),
        "total_file_bytes": total_bytes,
        "extensions": dict(extensions.most_common()),
        "sample": sample,
        "skipped_directories": skipped,
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
