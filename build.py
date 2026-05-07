"""Generate public/data/repos.json and public/data/build.json.

Calls `gh api` for each org and merges results. Filters out forks and
archived repos. Sorted by stars desc, then updatedAt desc.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "public" / "data"

# (kind, name)  →  gh API path
SOURCES: list[tuple[str, str]] = [
    ("user",  "Atzingen"),
    ("org",   "CEPAD-IFSP"),
    ("org",   "inteligenciaatuarial"),
    ("org",   "Rede-DSBR"),
]

FIELDS = [
    "name", "full_name", "description", "html_url",
    "stargazers_count", "forks_count", "language",
    "updated_at", "pushed_at", "fork", "archived", "owner",
]


def gh_repos(kind: str, name: str) -> list[dict]:
    """Fetch all public repos for a user or org via gh api with pagination."""
    endpoint = "users" if kind == "user" else "orgs"
    cmd = [
        "gh", "api",
        "--paginate",
        "-H", "Accept: application/vnd.github+json",
        f"/{endpoint}/{name}/repos?per_page=100&type=public",
    ]
    out = subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8")
    # gh --paginate returns concatenated JSON arrays as a stream of objects;
    # easiest robust parse: replace "][" with "," to coalesce arrays.
    text = out.stdout.replace("][", ",")
    return json.loads(text)


def slim(repo: dict) -> dict:
    return {
        "name": repo["name"],
        "fullName": repo["full_name"],
        "org": repo["owner"]["login"],
        "description": repo.get("description") or "",
        "url": repo["html_url"],
        "stars": repo.get("stargazers_count", 0),
        "forks": repo.get("forks_count", 0),
        "language": repo.get("language") or "—",
        "updatedAt": repo.get("pushed_at") or repo.get("updated_at"),
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_repos: list[dict] = []
    for kind, name in SOURCES:
        try:
            raw = gh_repos(kind, name)
        except subprocess.CalledProcessError as exc:
            print(f"[build] gh api failed for {kind}/{name}: {exc.stderr}",
                  file=sys.stderr)
            return 1
        kept = [r for r in raw if not r.get("fork") and not r.get("archived")]
        print(f"[build] {kind}/{name}: {len(raw)} total, {len(kept)} after filter")
        all_repos.extend(slim(r) for r in kept)

    # Sort: stars desc, then updatedAt desc
    all_repos.sort(
        key=lambda r: (-r["stars"], r["updatedAt"] or ""),
        reverse=False,
    )
    # Sorted with stars negated, so order is correct; ensure updatedAt desc tiebreak:
    all_repos.sort(
        key=lambda r: (r["stars"], r["updatedAt"] or ""),
        reverse=True,
    )

    repos_out = OUT_DIR / "repos.json"
    repos_out.write_text(
        json.dumps({"repos": all_repos, "count": len(all_repos)},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[build] wrote {repos_out} ({len(all_repos)} repos)")

    sha = os.environ.get("GITHUB_SHA")
    if not sha:
        try:
            sha = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                check=True, capture_output=True, text=True, encoding="utf-8"
            ).stdout.strip()
        except subprocess.CalledProcessError:
            sha = "dev"

    build_out = OUT_DIR / "build.json"
    build_out.write_text(
        json.dumps({
            "sha": sha,
            "shortSha": sha[:7] if len(sha) >= 7 else sha,
            "builtAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        }, indent=2),
        encoding="utf-8",
    )
    print(f"[build] wrote {build_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
