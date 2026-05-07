# Portfólio atzingen.dev — Design Spec

**Data:** 2026-05-07
**Repo (planejado):** `Atzingen/atzingen-dev`
**Local path (planejado):** `C:\Users\Gustavo\Desktop\dev\atzingen-dev\`
**Domínio de produção:** `atzingen.dev` (raiz) + redirect de `www.atzingen.dev`
**Co-existência:** `fii-alert.atzingen.dev` continua intocado (subdomínio à parte)

---

## 1. Objetivo

Single-page portfolio do **Gustavo Voltani von Atzingen** servindo como ponto de entrada profissional em `atzingen.dev`. Público-alvo: pessoas que querem entrar em contato, parceiros de pesquisa, alunos, recrutadores, colaboradores de projetos open source.

Critérios de sucesso:
- Acessar `atzingen.dev` mostra a página em < 1 s (estático, sem framework, sem build pesado).
- Em uma tela (acima da dobra) o visitante já sabe quem é, o que faz e como contatar.
- Quem rola até o fim entende a trajetória, vê os projetos em destaque, encontra todos os repositórios públicos relevantes filtráveis e tem múltiplos canais de contato.
- Identidade visual coerente com `fii-alert.atzingen.dev` (mesma família tipográfica, mesma paleta).
- Manutenção barata: editar 1-3 arquivos JSON pra atualizar bio, projetos ou papéis. Repos públicos são re-buscados automaticamente no build.
- Bilíngue (PT/EN) com toggle persistente.

---

## 2. Stack & Hospedagem

### Stack
- **HTML5** semântico, **CSS** custom (sem framework), **JS vanilla** (sem build de transpilação).
- Fontes via Google Fonts: `Instrument Serif` + `Geist` + `JetBrains Mono` (mesmas do FII scanner).
- Build em **Python** (`build.py`) que:
  1. Chama `gh api` pra listar repos públicos das 4 fontes (`Atzingen`, `CEPAD-IFSP`, `inteligenciaatuarial`, `Rede-DSBR`).
  2. Filtra forks e arquivados (configurável).
  3. Gera `public/data/repos.json`.
  4. Embute build SHA + timestamp em `public/data/build.json`.
- **Sem npm, sem node, sem Docker, sem Flask.** Diferentemente do `fii-scanner` (que precisa rodar lógica server-side), aqui é puro HTML estático.

### Hospedagem
- Servidor: `debian-dockers` (10.137.0.30, home network — único host atrás do NAT 80/443 do pfSense).
- Path: `/var/local/apps/atzingen-dev/`.
- Servidor web: **nginx do host serve direto a pasta `public/`** — não vamos containerizar. (Justificativa: zero processamento server-side, conteúdo estático; container nginx só duplicaria o nginx do host sem ganho.)
- Vhost: `atzingen.dev` + `www.atzingen.dev` → `root /var/local/apps/atzingen-dev/public;`
- HTTPS: Let's Encrypt via certbot.
- O atual lander (`/lander` redirect) será removido: o vhost passa a servir o index novo.

### CI/CD
- GitHub Actions: on push a `main`.
- Pipeline:
  1. SSH → `debian-dockers-deployer`.
  2. `cd /var/local/apps/atzingen-dev && git pull`.
  3. `make build` (roda `build.py`).
  4. `sudo nginx -s reload` (não precisa restart pra static — só quando o vhost muda).
- Deploy key dedicada por repo (padrão CEPAD), secrets `SSH_HOST_DEBIAN_DOCKERS`, `SSH_USER_DEBIAN_DOCKERS`, `SSH_PRIVATE_KEY_DEBIAN_DOCKERS`.

---

## 3. Identidade visual

Extensão da marca já estabelecida em `fii-alert.atzingen.dev`:

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0d0f12` | fundo principal |
| `--bg-elev` | `#15181d` | superfícies (cards) |
| `--bg-elev-2` | `#1c2026` | hover/active |
| `--border` | `#262a31` | linhas |
| `--border-strong` | `#363b44` | divisores |
| `--text` | `#e8e9ea` | texto principal |
| `--text-muted` | `#9ca1a8` | texto secundário |
| `--text-dim` | `#6b7079` | meta / labels |
| `--accent` | `#d4a14a` | destaque ouro (links, números, itálicos) |
| `--accent-soft` | `rgba(212,161,74,.12)` | fundos sutis |
| `--info` | `#7aa2f7` | links contextuais (PT/EN, tags) |
| `--good` | `#4ade80` | indicadores positivos |
| `--bad` | `#ef4444` | indicadores negativos |
| `--serif` | Instrument Serif | títulos, nome, números grandes |
| `--sans` | Geist | corpo |
| `--mono` | JetBrains Mono | tags, código, metadados |

Texturas: dois gradientes radiais sutis no `body` (canto superior direito ouro, canto inferior esquerdo azul) reproduzindo o "vinheta + ruído" do FII scanner.

Estilo geral: dark utility refinado, baixa densidade, muito espaço em branco (negativo), tipografia que faz o trabalho pesado, mínimo de linhas e bordas. Itálicos em serifada nos destaques (nome, números, palavras-âncora).

---

## 4. Estrutura da página (single scroll)

### 4.1 Top bar (sticky, transparente até primeiro scroll)
- Esquerda: marca minimalista — `<em>von</em>·atzingen` (matching pattern do FII scanner)
- Centro/direita: nav âncora invisível em mobile; em desktop, links pra `#sobre`, `#papeis`, `#projetos`, `#contato`
- Extremo direito: toggle `PT|EN`, link external Lattes/LinkedIn pequenos

### 4.2 HERO (acima da dobra, ~95vh)
Layout grid 12 col:
- Esquerda (col 1-7): **Foto** circular ~220px (rosto.jpeg) + **Nome em serifada gigante** (`Gustavo von Atzingen`, com `von` itálico ouro).
- Direita (col 8-12): tagline em duas linhas `Professor · Pesquisador · Engenheiro` + bio one-liner ("Computer vision, EEG, atuarial e sistemas pra educação e governo").
- Linha inferior: **5 papéis em grid horizontal** com símbolo `·` separando:
  - `IFSP Piracicaba` (Professor)
  - `CEPAD-IFSP` (Pesquisador)
  - `Plataforma Nilo Peçanha` (Cientista de Dados)
  - `Quickium` (Founder & CTO)
  - `Inteligência Atuarial` (Sócio)
- Linha de contato compacta: ícones SVG inline (email, github, lattes, linkedin) com hover ouro
- Indicador discreto de scroll (seta + label "rolar")

### 4.3 SOBRE (`#sobre`)
- 2-3 parágrafos — origem acadêmica + foco atual + filosofia de trabalho.
- Sidebar direita com bullets de "highlights": formação compacta (USP IFSC → USP FZEA), cidade base (Piracicaba), áreas, links para Lattes/LinkedIn em destaque.
- **Bio draft (PT)** — para o usuário revisar:

> **Físico de formação, engenheiro de alimentos por treino, e hoje muito mais.** Bacharel em Física pela USP/IFSC (2007), com Mestrado e Doutorado em Engenharia de Alimentos pela FZEA-USP (2013/2017), trabalhando com instrumentação eletrônica e simulação numérica de processos térmicos. Sou professor no **IFSP Campus Piracicaba** desde então.
>
> Como pesquisador, trabalho com **visão computacional, EEG, machine learning aplicado e instrumentação embarcada**. No CEPAD-IFSP coordeno e participo de projetos de plataformas digitais para iniciativas governamentais — Plataforma Nilo Peçanha (rede federal CET/IF), dashboards de cestas básicas (MDS), agroecologia (MMA) — e fui coordenador do programa IFMAISEMPREENDEDOR em Piracicaba (2023, 2025).
>
> Em paralelo, fundei a **Quickium** e sou sócio da **Inteligência Atuarial**, onde construímos motores de cálculo e sistemas de gestão atuarial para RPPS. Filosofia: software que precisa **rodar, ser mantido e gerar valor mensurável**.

(EN translation no spec final.)

#### Highlights compactos para a sidebar
- **Formação:** USP IFSC (2007) · USP FZEA Mestrado (2013) · USP FZEA Doutorado (2017)
- **Base:** Piracicaba/SP
- **Atualmente:** Professor IFSP · Pesquisador CEPAD-IFSP · Plataforma Nilo Peçanha (Cientista de Dados)
- **Áreas:** Computer Vision · EEG · Atuarial · IoT · Power BI

### 4.4 ÁREAS DE PESQUISA & ATUAÇÃO (`#areas`)
Grid de tags clicáveis. Clicar filtra a seção `#projetos` e a tabela `#open-source`.

| Tag | Descrição curta |
|---|---|
| Machine Learning | modelos, pipelines, MLOps |
| Computer Vision | detecção, segmentação, classificação |
| CV Embarcada | YOLO, edge devices, microcontroladores |
| EEG / Signals | aquisição, classificação neural |
| Atuarial / RPPS | motores, projeções 75 anos, gestão |
| Power BI / Data Eng | TMDL, modelagem, automação |
| AI Dev Tools | LLM workflow, infra Claude |
| Government Data | PNP, MDS, MMA, FNDE, IFSP |

### 4.5 PAPÉIS (`#papeis`)
4 cards expansíveis. Cada um:
- Header: organização + papel + período
- Descrição
- Lista de projetos/sites associados (chips com link)
- Link external (site oficial da org)

**Cards (conteúdo curado):**

1. **IFSP Piracicaba — Professor** (atual)
   - Disciplinas: IA, Visão Computacional, Visão Computacional Embarcada
   - Material aberto: `IA-FIC-IFSP` (28⭐), `Webinar-Visão-Computacional-Embarcada` (10⭐), `VisaoComputacionalEmbarcada-2024`
   - Link: ifsp.edu.br

2. **CEPAD-IFSP — Pesquisador** (atual)
   - Centro de Pesquisa em Análise de Dados, parcerias com MDS, MMA, FNDE
   - Projetos: `alimentacidades`, `dash-bacias`, `agroecologiaMMA`, `deserto-ia`, `cozinhasolidaria`, `agrotoxico-analytics`, `Airflow-ETL`
   - Link: cepad.digital

3. **Quickium — Founder & CTO**
   - Tecnologia, soluções customizadas
   - Link: quickium.com (placeholder — confirmar URL)

4. **Inteligência Atuarial — Sócio**
   - RPPS, motores de cálculo, sistemas de gestão atuarial
   - Projetos: `iaprev` (gestão de segurados), `motor-ia` (cálculo atuarial 75 anos), `portal-bases`, `magma`
   - Link: inteligenciaatuarial.com.br (placeholder — confirmar URL)

5. **Rede-DSBR / Plataforma Nilo Peçanha** (Cientista de Dados, 2023 - atual)
   - Plataforma federal oficial de dados da rede CET/IF (SETEC/MEC)
   - Projetos: `kiosk-pnp`, `pnp-web`, `ExtratorV2`, `pnp-monitor`, `pnp-publicada`

### 4.6 PROJETOS EM DESTAQUE (`#projetos`)
9 cards curados em grid 3×3 (responsive). Cada card:
- Tag de área (ex: "computer vision", "atuarial")
- Título do projeto (link)
- 1 frase de descrição
- Stack como mono chips
- Linha de footer: ⭐ stars · linguagem · GitHub link · demo link (se houver)

**Lista curada inicial:**
1. `hey-jarvis` — Voice dev launcher (Linux/Hyprland, openWakeWord + faster-whisper + piper) · 13⭐
2. `IA-FIC-IFSP` — Material curso IA · 28⭐
3. `tmdl-parser` — Lib Python pra TMDL/Power BI · 7⭐
4. `Webinar-Visão-Computacional-Embarcada` — Material webinar · 10⭐
5. `fii-scanner` — Monitor B3 com alertas (live em fii-alert.atzingen.dev)
6. `EEG_Sweetners` — Pesquisa EEG efeito adoçantes
7. `claude-monitor` — TUI dashboard pra Claude Code
8. `alimentacidades` (CEPAD) — Plataforma alimentar municípios
9. `iaprev` (IA) — Sistema gestão segurados RPPS

### 4.7 ENSINO, PESQUISA & DIVULGAÇÃO (`#ensino`)
Lista vertical, agrupada:
- **Disciplinas atuais (IFSP)** — IA, Visão Computacional, Visão Computacional Embarcada
- **Cursos abertos** — `IA-FIC-IFSP`, `R-exams-Interface`, `Oficinas_IFEMPREENDEDOR_2024`
- **Webinars / palestras** — `Webinar-Visão-Computacional-Embarcada` (10⭐)
- **Programas coordenados** — IFMAISEMPREENDEDOR Piracicaba (2023, 2025)
- **Orientações ativas (IFSP)** — IC EEG/IA (tarefas cognitivas, café), Corretor de Scripts, projeto de IA embarcada (Cubatão+Guarulhos)
- **Cursos técnicos PROEJA** (placeholder — confirmar se relevante listar)

### 4.8 PUBLICAÇÕES SELECIONADAS (`#publicacoes`)
Lista cronológica reversa, mostrando 6-8 publicações em periódicos com filtro "ver todas". Formato compacto: `Ano · Revista · Título · co-autores ·  link DOI/journal`.

**Lista inicial (do Lattes via Escavador, conferida 2026-05-07):**

1. **2024** — *Detection of news written by the ChatGPT through authorship attribution performed by a bidirectional LSTM model* — Caderno Pedagógico, v.21 — c/ Iaquinta, A.F.
2. **2023** — *Improving Behavior Monitoring of Free-Moving Dairy Cows Using Noninvasive Wireless EEG Approach and Digital Signal Processing Techniques* — Applied Sciences, v.13 — c/ Silva, Arce, Arteaga, Sarnighausen, Costa
3. **2022** — *The convolutional neural network as a tool to classify electroencephalography data resulting from the consumption of juice sweetened with caloric or non-caloric sweeteners* — Frontiers in Nutrition, v.9 — c/ Arteaga, Silva, Ortega, Costa **(primeiro autor)**
4. **2021** — *EEG Multipurpose Eye Blink Detector using convolutional neural network* — Research, Society and Development, v.10 — c/ Iaquinta, Silva, Ferraz Jr, Toledo
5. **2019** — *Electronic Instrumentation and Computational Simulation to Evaluate the Combined Use of Microwave and Infrared Technologies for Reheating Biphasic Foods* — Int. Journal of Food Engineering — c/ Piza, Costa
6. **2019** — *Viscosities and Densities of Fatty Alcohol Mixtures from 298.15 to 338.15 K* — Journal of Chemical and Engineering Data, v.64 — c/ Pinto, Frugoli, Florido, Rodrigues, Gonçalves
7. **2017** — *Real-Time Control System Based on the Values of Derivative of the Redox Potential Aiming Nitrogen Removal in a Sequencing Batch Reactor* — Water, Air and Soil Pollution — c/ Ribeiro, Lima, Okamoto, Arce, Tomamso, Costa
8. **2015** — *Lattice Boltzmann simulation of cafestol and kahweol extraction from green coffee beans in high-pressure system* — Journal of Food Engineering, v.176 — c/ Rosa, Belandria, Oliveira, Bostyn, Rabi

CTA ao final: "Lista completa no Lattes →" (link).

### 4.9 OPEN SOURCE (`#open-source`)
Tabela compacta filtrável renderizada client-side a partir de `repos.json`.
- Colunas: Repo · Org · Linguagem · ⭐ · Atualizado · Descrição
- Controles: input de busca (filtra nome+descrição), pills de linguagem (toggle), pill "ativo nos últimos 12 meses"
- Click no nome → GitHub
- Default sort: ⭐ desc, depois `updatedAt` desc
- Limite inicial: 50 linhas, "ver todos" expande

### 4.10 CONTATO (`#contato`)
Grid 2 colunas:
- **E-mails**: `gustavo.von@ifsp.edu.br` (acadêmico), `gustavo.von.atzingen@gmail.com` (pessoal), e-mails de Quickium/IA se houver (placeholder a confirmar)
- **Perfis**: GitHub (4 links com label), Lattes, LinkedIn
- CTA discreto: "Aberto a parcerias de pesquisa, palestras e projetos."

### 4.11 FOOTER
- `© 2026 Gustavo von Atzingen — atzingen.dev`
- Build SHA short (linkado pro commit no GitHub)
- Toggle PT|EN duplicado

---

## 5. i18n

- Arquitetura: dicionário JS no `i18n.js` com objeto `{ pt: {...}, en: {...} }` e seletor `data-i18n="key"` em todo nó traduzível.
- Toggle persiste em `localStorage["lang"]`. `lang` attr no `<html>` é atualizado.
- Default: PT-BR. Inicialização lê `localStorage` ou `navigator.language` (`/^en/` → EN, senão PT).
- Conteúdo bilíngue: bio, taglines, descrições de papéis, descrições dos 9 projetos curados, labels da tabela de repos. Nomes de repos, descrições do GitHub e títulos de projetos open source ficam no original (não traduzidos).

---

## 6. Estrutura de arquivos do repo

```
atzingen-dev/
├── README.md
├── Makefile               # build, deploy, dev
├── build.py               # gera repos.json e build.json
├── .github/workflows/
│   └── deploy.yml         # CI/CD
├── docs/
│   ├── DEPLOY.md          # passo-a-passo de deploy (espelhando padrão FII)
│   └── superpowers/
│       └── specs/
│           └── 2026-05-07-portfolio-design.md   # este arquivo
├── data/
│   ├── profile.json       # bio PT/EN, papéis, contatos
│   ├── projects.json      # 9 projetos em destaque (curado)
│   └── repos.json         # gerado por build.py (gitignore)
└── public/                # o que o nginx serve
    ├── index.html
    ├── assets/
    │   ├── rosto.jpeg     # vinda de C:/Users/Gustavo/Utilitarios/rosto.jpeg
    │   ├── favicon.svg
    │   └── icons/         # email/github/lattes/linkedin SVG inline-able
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── i18n.js
    │   ├── filter.js      # filtro de tags + busca de repos
    │   └── main.js        # boot, hidratação de JSONs, scroll, toggle
    └── data/              # cópia dos JSONs do nível root, exposta ao browser
```

(Mantém `data/` na raiz pra editar e copia pra `public/data/` no build — evita confusão de paths.)

---

## 7. Conteúdo: fontes da verdade

| Conteúdo | Fonte | Manutenção |
|---|---|---|
| Bio, papéis, contatos | `data/profile.json` (editado à mão) | Quando muda algo da carreira |
| 9 projetos em destaque | `data/projects.json` (editado à mão) | Quando promove/destaca um novo projeto |
| Lista completa de repos | `data/repos.json` (gerado) | Atualizada a cada `make build` (= cada deploy) |
| Foto | `public/assets/rosto.jpeg` | Substituir o arquivo |
| Tradução | dicionário em `js/i18n.js` | Quando adiciona seções |

---

## 8. Decisões intencionais (out of scope)

- **Sem blog** — pode virar fase futura (`/notes` ou `notes.atzingen.dev`).
- **Sem analytics** — adicionar depois (Plausible self-host ou similar) se houver demanda.
- **Sem modo claro** — a marca é dark; modo claro fica pra v2 se justificar.
- **Sem CMS** — overkill pra conteúdo que muda raramente; JSON na mão é mais barato.
- **Sem comentários / formulário de contato** — e-mail direto cumpre o papel sem moderar spam.

---

## 9. Itens pendentes de confirmação do usuário

(Preencher antes do deploy; placeholders no spec por ora.)

1. **URL oficial Quickium** — qual? (placeholder atual: `quickium.com`)
2. **URL oficial Inteligência Atuarial** — qual? (placeholder atual: `inteligenciaatuarial.com.br`)
3. **E-mails comerciais** — incluir e-mail de Quickium/IA na seção contato? Quais?
4. **Bio draft (seção 4.3)** — tá na voz que você quer ou prefere reescrever?
5. **Versão EN da bio** — eu traduzo e você revisa, ou prefere mandar pronta?
6. **Texto pra Quickium card** — descrição curta do que a Quickium faz (não tenho contexto público).

---

## 10. Critérios de aceite (prontos pra ship)

- [ ] `https://atzingen.dev` retorna 200 com a página renderizada (não mais o `/lander`).
- [ ] `https://www.atzingen.dev` redireciona pra raiz.
- [ ] `https://fii-alert.atzingen.dev` continua funcionando (não tocar).
- [ ] Lighthouse mobile ≥ 95 em performance, acessibilidade, best-practices, SEO.
- [ ] Toggle PT|EN funciona, persiste, tem hreflang correto.
- [ ] Foto carrega, bio aparece, 5 papéis visíveis acima da dobra em viewport 1280×800.
- [ ] Tabela de repos lista ≥ 30 entradas das 4 orgs.
- [ ] Filtro por tag funciona (clicar em "Computer Vision" reduz visivelmente projetos+repos).
- [ ] Pipeline GitHub Actions verde no primeiro push.
- [ ] Cert SSL Let's Encrypt válido em ambos os hostnames.
- [ ] OpenGraph + Twitter Card configurados (preview com foto + nome em link compartilhado).
- [ ] favicon visível.

---

## 11. Próximo passo

Após aprovação deste spec, invocar **`superpowers:writing-plans`** para gerar o plano de implementação fase a fase (scaffolding repo → CSS base → hero → seções → build script → deploy).
