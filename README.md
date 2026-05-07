# atzingen.dev

Personal portfolio — single-page static site with bilingual content.

**Live:** https://atzingen.dev

## Stack
HTML + custom CSS + vanilla JS. Python build script generates the public-repo
index from `gh api` across `Atzingen`, `CEPAD-IFSP`, `inteligenciaatuarial`
and `Rede-DSBR`.

## Develop locally
```sh
make build      # generate repos.json from GitHub
make dev        # python -m http.server -d public 8080
```

Open http://localhost:8080.

## Edit content
- `public/data/profile.json` — bio, papéis, contatos (PT/EN)
- `public/data/projects.json` — featured projects
- `public/data/publications.json` — selected papers
- `public/data/i18n.json` — UI strings

## Deploy
GitHub Actions on push to `main` → SSH `debian-dockers-deployer` →
`git pull && make build && nginx -s reload`. Static files served direct by
host nginx from `/var/local/apps/atzingen-dev/public/`.

See `docs/DEPLOY.md` for the manual one-time setup.
