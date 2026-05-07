"""Generate public/data/repos.json and public/data/build.json.

Pulls the public repo list from GitHub for each source (one user + three
orgs), filters out forks/archived, and writes a slim JSON sorted by stars
desc then updatedAt desc.

Uses only the Python stdlib so it runs anywhere with python3 — no `gh`
CLI required on the server. Optional auth via the GITHUB_TOKEN env var
(raises the rate limit from 60/hour to 5000/hour).
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "public" / "data"

SOURCES: list[tuple[str, str]] = [
    ("user", "Atzingen"),
    ("org",  "CEPAD-IFSP"),
    ("org",  "inteligenciaatuarial"),
    ("org",  "Rede-DSBR"),
]

API = "https://api.github.com"


def fetch_page(url: str) -> tuple[list[dict], str | None]:
    """Fetch one page; return (data, next_url or None)."""
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "atzingen-dev-build",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        link = resp.headers.get("Link") or ""
    next_url: str | None = None
    for part in link.split(","):
        seg = part.strip()
        if seg.endswith('rel="next"'):
            next_url = seg.split(";", 1)[0].strip().lstrip("<").rstrip(">")
            break
    return body, next_url


def gh_repos(kind: str, name: str) -> list[dict]:
    endpoint = "users" if kind == "user" else "orgs"
    url = f"{API}/{endpoint}/{name}/repos?per_page=100&type=public"
    out: list[dict] = []
    while url:
        page, url = fetch_page(url)
        out.extend(page)
    return out


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
        except urllib.error.HTTPError as exc:
            print(f"[build] HTTP {exc.code} for {kind}/{name}: {exc.reason}",
                  file=sys.stderr)
            return 1
        kept = [r for r in raw if not r.get("fork") and not r.get("archived")]
        print(f"[build] {kind}/{name}: {len(raw)} total, {len(kept)} after filter")
        all_repos.extend(slim(r) for r in kept)

    all_repos.sort(key=lambda r: (r["stars"], r["updatedAt"] or ""), reverse=True)

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
                check=True, capture_output=True, text=True, encoding="utf-8",
                cwd=str(ROOT),
            ).stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
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
