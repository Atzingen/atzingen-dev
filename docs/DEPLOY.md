# Deploy — atzingen.dev

Setup one-time já executado em `debian-dockers` em **2026-05-07**.
Este doc serve de referência se precisar reproduzir em outro servidor.

## Servidor de produção

- **Host**: `debian-dockers` (10.137.0.30) — atrás do NAT 80/443 do pfSense.
- **Path da app**: `/var/local/apps/atzingen-dev/`.
- **Domínio**: `atzingen.dev` (apex) + `www.atzingen.dev` (redirect 301 para apex).
- **DNS apex** (GoDaddy): `A @ → 189.98.101.26 TTL 600` + `CNAME www → atzingen.dev.`
- **Co-existência**: `fii-alert.atzingen.dev` (FII scanner) continua intocado em
  `/var/local/apps/fii-scanner/`. Vhost dele é separado, em
  `/etc/nginx/sites-available/fii-alert.conf`. Nada do deploy do portfólio toca esse vhost.

## Por que não tem Docker

Diferente do FII (Flask app que precisa de processamento server-side), o
portfólio é **HTML estático puro**. Containerizar nginx só para servir
`public/` duplicaria o nginx do host sem ganho. Por isso a app vive como
arquivos no disco e o nginx do host serve direto.

## Estrutura no servidor

```
/var/local/apps/atzingen-dev/
├── public/              # ← nginx serve daqui (root)
│   ├── index.html
│   ├── css/, js/, assets/
│   └── data/            # JSONs commitados + gerados (repos/build)
├── build.py             # gera repos.json, build.json (stdlib only)
├── Makefile
└── docs/
```

O nginx tem `root /var/local/apps/atzingen-dev/public;` e serve diretamente.
Sem reload é necessário após `git pull` para conteúdo estático — só após
mudanças de vhost.

## 1. Deploy key SSH (uma vez)

```bash
ssh deployer@debian-dockers
ssh-keygen -t ed25519 -f ~/.ssh/atzingen-dev_deploy_key -N "" -C "atzingen-dev@$(hostname)"
cat ~/.ssh/atzingen-dev_deploy_key.pub
```

Cadastrar a chave pública no GitHub (read-only):
```bash
gh repo deploy-key add /caminho/atzingen-dev_deploy_key.pub \
  --repo Atzingen/atzingen-dev --title "debian-dockers (deployer)"
```

Adicionar alias SSH em `~/.ssh/config` do `deployer`:
```
Host github.com-atzingen-dev
  HostName github.com
  User git
  IdentityFile ~/.ssh/atzingen-dev_deploy_key
  IdentitiesOnly yes
```

Test: `ssh -T github.com-atzingen-dev` → `Hi Atzingen/atzingen-dev!`.

## 2. Clone

```bash
git clone git@github.com-atzingen-dev:Atzingen/atzingen-dev.git \
  /var/local/apps/atzingen-dev
cd /var/local/apps/atzingen-dev
python3 build.py    # primeira geração de repos.json/build.json
```

## 3. Vhost nginx

Conteúdo do `/etc/nginx/sites-available/atzingen-dev.conf` (versão final
após o certbot):

```nginx
# 1) HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name atzingen.dev www.atzingen.dev;
    include snippets/letsencrypt.conf;
    location / { return 301 https://atzingen.dev$request_uri; }
}

# 2) HTTPS www → HTTPS apex
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.atzingen.dev;
    ssl_certificate     /etc/letsencrypt/live/atzingen.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/atzingen.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://atzingen.dev$request_uri;
}

# 3) HTTPS apex — content
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name atzingen.dev;
    ssl_certificate     /etc/letsencrypt/live/atzingen.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/atzingen.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/atzingen-dev-access.log;
    error_log  /var/log/nginx/atzingen-dev-error.log;

    root /var/local/apps/atzingen-dev/public;
    index index.html;

    location / { try_files $uri $uri/ =404; }

    location ~* \.(?:css|js|svg|png|jpe?g|webp|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    location ~ /\.(?!well-known) { deny all; }
}
```

Habilitar + testar + reload:
```bash
sudo ln -sf /etc/nginx/sites-available/atzingen-dev.conf \
            /etc/nginx/sites-enabled/atzingen-dev.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Cert Let's Encrypt

Inicial (em vhost HTTP-only, antes do bloco final de cima):
```bash
sudo certbot --nginx -d atzingen.dev -d www.atzingen.dev \
  --non-interactive --agree-tos --redirect \
  -m gustavo.von.atzingen@gmail.com
```

Renovação é automática (cron systemd do certbot já rodando).

## 5. Atualização contínua (CI/CD)

Self-hosted GitHub Actions runner registrado para o repo `Atzingen/atzingen-dev`,
seguindo o padrão dos outros runners em `debian-dockers`. Workflow em
`.github/workflows/deploy.yml`:

- Trigger: push a `main`
- Job:
  1. `git pull` no `/var/local/apps/atzingen-dev/`
  2. `python3 build.py` (regenera `repos.json`/`build.json`)
  3. (Sem reload de nginx — conteúdo é estático)

Nada de SSH externo: GitHub envia o job para o runner local, que já tem
acesso direto ao repo path.

## 6. Atualização manual (sem CI/CD)

```bash
ssh debian-dockers-deployer
cd /var/local/apps/atzingen-dev
git pull
python3 build.py
```

Pronto — o nginx pega os arquivos novos no próximo request.

## Edição de conteúdo

Tudo o que não vem de `gh api` é editável em arquivos JSON commitados:

- `public/data/profile.json` — bio, papéis, contatos (PT/EN)
- `public/data/projects.json` — 9 projetos em destaque (PT/EN)
- `public/data/publications.json` — publicações selecionadas
- `public/data/i18n.json` — strings de UI (PT/EN)

Para gerar uma nova OG image (ex: foto nova):
```bash
python3 public/assets/_make_og.py
```

## Troubleshooting

- **Site fora do ar**: `sudo systemctl status nginx` + `tail -f /var/log/nginx/atzingen-dev-error.log`.
- **Cert expirado**: `sudo certbot renew --dry-run`. Renovação automática
  roda em `/etc/cron.d/certbot` (ou systemd timer).
- **Build falhou no CI**: workflow logs em
  `https://github.com/Atzingen/atzingen-dev/actions`. Provavelmente rate
  limit do GitHub API — adicionar `GITHUB_TOKEN` como secret resolve.
- **DNS errado**: `nslookup atzingen.dev 1.1.1.1` deve retornar
  `189.98.101.26`. Se não, conferir GoDaddy.
