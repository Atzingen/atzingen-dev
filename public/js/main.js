/* atzingen.dev — main
 * Loads profile.json, projects.json, publications.json, repos.json,
 * build.json and renders sections by [data-bind] attribute.
 * Re-renders content that depends on language on "atzingen:lang" event.
 */

(function () {
  "use strict";

  const state = {
    profile: null,
    projects: null,
    publications: null,
    repos: null,
    build: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- helpers ----------

  function lang() { return window.atzI18n?.lang || "pt"; }
  function t(key) { return window.atzI18n?.get(key) || key; }
  function pick(obj) {
    if (obj && typeof obj === "object" && (obj.pt || obj.en)) return obj[lang()] ?? obj.pt;
    return obj;
  }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return node;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  }
  function findRepo(name, org) {
    if (!state.repos) return null;
    return state.repos.repos.find((r) => r.name === name && (!org || r.org === org)) || null;
  }

  // ---------- renderers ----------

  function renderHero() {
    const p = state.profile;
    if (!p) return;
    $("[data-bind='profile.tagline']").textContent = pick(p.tagline);
    $("[data-bind='profile.oneLiner']").textContent = pick(p.oneLiner);

    const roleRow = $("[data-bind='profile.roles.compact']");
    roleRow.innerHTML = "";
    p.roles.forEach((r, i) => {
      if (i > 0) roleRow.appendChild(el("li", { class: "sep" }, "·"));
      roleRow.appendChild(el("li", { class: "role-chip" }, [
        el("span", { class: "role-org" }, r.org),
        el("span", { class: "role-title" }, pick(r.title)),
      ]));
    });

    const contact = $("[data-bind='profile.contact.compact']");
    contact.innerHTML = "";
    const items = [
      { icon: "email",    label: "email",    href: `mailto:${p.contact.emails[0].addr}` },
      { icon: "github",   label: "github",   href: p.contact.github[0].url },
      { icon: "lattes",   label: "lattes",   href: p.contact.lattes },
      { icon: "linkedin", label: "linkedin", href: p.contact.linkedin },
    ];
    items.forEach((it) => {
      contact.appendChild(el("li", {}, el("a", {
        href: it.href, target: it.href.startsWith("mailto:") ? null : "_blank",
        rel: "noopener", "aria-label": it.label, class: "icon-link",
      }, [
        el("img", { src: `/assets/icons/${it.icon}.svg`, alt: "", width: 18, height: 18 }),
      ])));
    });
  }

  function renderAbout() {
    const p = state.profile;
    const prose = $("[data-bind='profile.bio']");
    prose.innerHTML = "";
    pick(p.bio).forEach((para) => prose.appendChild(el("p", {}, para)));

    const side = $("[data-bind='profile.highlights']");
    side.innerHTML = "";
    side.appendChild(el("h3", { class: "eyebrow" }, t("section.about.highlights")));
    const hl = el("ul", { class: "highlights" }, [
      el("li", {}, [
        el("span", { class: "key" }, lang() === "pt" ? "Formação" : "Education"),
        el("span", {}, p.education.map((e) => `${e.level} ${e.inst} (${e.year})`).join(" · ")),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, lang() === "pt" ? "Base" : "Based in"),
        el("span", {}, p.base),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, lang() === "pt" ? "Áreas" : "Areas"),
        el("span", {}, p.areas.map((a) => pick(a.label)).join(" · ")),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, "Lattes"),
        el("a", { href: p.contact.lattes, target: "_blank", rel: "noopener" }, "lattes.cnpq.br"),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, "LinkedIn"),
        el("a", { href: p.contact.linkedin, target: "_blank", rel: "noopener" }, "/in/gustavoatzingen"),
      ]),
    ]);
    side.appendChild(hl);
  }

  function renderAreas() {
    const ul = $("[data-bind='profile.areas']");
    ul.innerHTML = "";
    ul.appendChild(el("li", {}, el("button", {
      type: "button", class: "area-pill is-active", "data-area": "all",
    }, t("section.projects.allAreas"))));
    state.profile.areas.forEach((a) => {
      ul.appendChild(el("li", {}, el("button", {
        type: "button", class: "area-pill", "data-area": a.id,
      }, pick(a.label))));
    });
  }

  function renderRoles() {
    const grid = $("[data-bind='profile.roles.full']");
    grid.innerHTML = "";
    state.profile.roles.forEach((r) => {
      const card = el("article", { class: "role-card", "data-role": r.id });
      card.appendChild(el("header", {}, [
        el("h3", {}, r.org),
        el("span", { class: "role-period" }, r.period),
      ]));
      card.appendChild(el("div", { class: "role-title" }, pick(r.title)));
      card.appendChild(el("p", {}, pick(r.description)));
      if (r.projects && r.projects.length) {
        const chips = el("ul", { class: "chip-row" });
        r.projects.forEach((name) => {
          // Public repo found in repos.json → real link.
          // Otherwise (private/internal repo) → render as plain chip, no link.
          const repo = findRepo(name);
          const chip = repo
            ? el("a", { href: repo.url, target: "_blank", rel: "noopener", class: "chip" }, name)
            : el("span", { class: "chip chip-private" }, name);
          chips.appendChild(el("li", {}, chip));
        });
        card.appendChild(chips);
      }
      if (r.url) {
        card.appendChild(el("a", {
          href: r.url, target: "_blank", rel: "noopener", class: "role-link",
        }, r.url.replace(/^https?:\/\//, "")));
      }
      grid.appendChild(card);
    });
  }

  function renderProjects() {
    const grid = $("[data-bind='projects.featured']");
    grid.innerHTML = "";
    state.projects.featured.forEach((p) => {
      const repo = findRepo(p.name, p.org);
      const stars = repo?.stars ?? 0;
      const lng = repo?.language || (p.stack && p.stack[0]) || "—";
      const card = el("article", {
        class: "project-card", "data-areas": (p.areas || []).join(" "),
      }, [
        el("div", { class: "project-tags" },
          (p.areas || []).map((a) => el("span", { class: "tag tag-area", "data-area": a }, a))),
        el("h3", {}, el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.name)),
        el("p", {}, pick(p.summary)),
        el("ul", { class: "stack-row" },
          (p.stack || []).map((s) => el("li", { class: "tag tag-mono" }, s))),
        el("footer", { class: "project-foot" }, [
          el("span", { class: "tag tag-mono" }, lng),
          stars > 0 ? el("span", { class: "stars" }, `★ ${stars}`) : null,
          el("a", { href: p.url, target: "_blank", rel: "noopener" }, "GitHub"),
          p.demo ? el("a", { href: p.demo, target: "_blank", rel: "noopener", class: "demo-link" }, "demo") : null,
        ]),
      ]);
      grid.appendChild(card);
    });
  }

  function renderTeaching() {
    const grid = $("[data-bind='profile.teaching']");
    grid.innerHTML = "";
    const tg = state.profile.teaching;
    const blocks = [
      { key: "section.teaching.courses",       items: tg.courses },
      { key: "section.teaching.openMaterial",  items: tg.openMaterial },
      { key: "section.teaching.talks",         items: tg.talks },
      { key: "section.teaching.coordinated",   items: tg.programsCoordinated },
      { key: "section.teaching.advising",      items: tg.advisingActive },
    ];
    blocks.forEach((b) => {
      grid.appendChild(el("section", { class: "teach-block" }, [
        el("h3", { class: "eyebrow" }, t(b.key)),
        el("ul", {}, (b.items || []).map((i) => el("li", {}, i))),
      ]));
    });
  }

  function renderPublications() {
    const list = $("[data-bind='publications.selected']");
    list.innerHTML = "";
    state.publications.selected.forEach((p) => {
      const li = el("li", { class: "pub-item" }, [
        el("span", { class: "pub-year" }, String(p.year)),
        el("div", { class: "pub-body" }, [
          el("div", { class: "pub-title" },
            p.url ? el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.title) : p.title,
          ),
          el("div", { class: "pub-meta" }, [
            el("span", { class: "pub-venue" }, p.venue + (p.vol ? ` · ${p.vol}` : "")),
            p.isFirstAuthor ? el("span", { class: "tag tag-mono pub-first" }, t("section.publications.firstAuthor")) : null,
          ]),
          el("div", { class: "pub-authors" }, p.coauthors.join(" · ")),
        ]),
      ]);
      list.appendChild(li);
    });
    const cta = $("[data-bind='publications.lattesCta']");
    cta.href = state.publications.lattesUrl;
    cta.textContent = t("section.publications.lattesCta");
  }

  function renderContact() {
    const grid = $("[data-bind='profile.contact.full']");
    grid.innerHTML = "";
    const c = state.profile.contact;

    const emails = el("div", {}, [
      el("h3", { class: "eyebrow" }, t("section.contact.emails")),
      el("ul", { class: "contact-list" },
        c.emails.map((e) => el("li", {}, [
          el("span", { class: "key" }, e.label),
          el("a", { href: `mailto:${e.addr}` }, e.addr),
        ]))),
    ]);

    const profiles = el("div", {}, [
      el("h3", { class: "eyebrow" }, t("section.contact.profiles")),
      el("ul", { class: "contact-list" }, [
        ...c.github.map((g) => el("li", {}, [
          el("span", { class: "key" }, "GitHub"),
          el("a", { href: g.url, target: "_blank", rel: "noopener" }, g.label),
        ])),
        el("li", {}, [
          el("span", { class: "key" }, "Lattes"),
          el("a", { href: c.lattes, target: "_blank", rel: "noopener" }, "lattes.cnpq.br/5173282107514295"),
        ]),
        el("li", {}, [
          el("span", { class: "key" }, "LinkedIn"),
          el("a", { href: c.linkedin, target: "_blank", rel: "noopener" }, "/in/gustavoatzingen"),
        ]),
      ]),
    ]);

    grid.appendChild(emails);
    grid.appendChild(profiles);
  }

  function renderRepos() {
    if (!state.repos) return;
    const tbody = $("[data-bind='repos.rows']");
    tbody.innerHTML = "";

    // Keep only repos with a real description, sorted newest first, max 20
    const shown = state.repos.repos
      .filter((r) => r.description && r.description.trim() !== "")
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, 20);

    shown.forEach((r) => {
      const tr = el("tr", { "data-lang": r.language, "data-org": r.org, "data-updated": r.updatedAt }, [
        el("td", {}, el("a", { href: r.url, target: "_blank", rel: "noopener", class: "mono" }, r.name)),
        el("td", { class: "mono dim" }, r.org),
        el("td", { class: "mono" }, r.language),
        el("td", { class: "mono num" }, r.stars > 0 ? String(r.stars) : ""),
        el("td", { class: "mono dim" }, fmtDate(r.updatedAt)),
        el("td", {}, r.description || ""),
      ]);
      tbody.appendChild(tr);
    });

    const langs = $("[data-bind='repos.languages']");
    langs.innerHTML = "";
    const all = el("li", {}, el("button", {
      type: "button", class: "lang-pill is-active", "data-lang-filter": "*",
    }, lang() === "pt" ? "todas" : "all"));
    langs.appendChild(all);
    const counts = new Map();
    shown.forEach((r) => counts.set(r.language, (counts.get(r.language) || 0) + 1));
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([lng, n]) => {
        langs.appendChild(el("li", {}, el("button", {
          type: "button", class: "lang-pill", "data-lang-filter": lng,
        }, `${lng} (${n})`)));
      });
  }

  function renderFooter() {
    $("[data-bind='footer.year']").textContent = String(new Date().getFullYear());
    const a = $("[data-bind='footer.build']");
    if (a && state.build) {
      a.textContent = state.build.shortSha;
      a.href = `https://github.com/Atzingen/atzingen-dev/commit/${state.build.sha}`;
      a.target = "_blank";
      a.rel = "noopener";
    }
  }

  function renderAll() {
    renderHero();
    renderAbout();
    renderAreas();
    renderRoles();
    renderProjects();
    renderTeaching();
    renderPublications();
    renderContact();
    renderRepos();
    renderFooter();
  }

  // ---------- boot ----------

  async function loadJSON(url, optional = false) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (err) {
      if (optional) return null;
      console.error(`[main] failed to load ${url}`, err);
      return null;
    }
  }

  async function boot() {
    const [profile, projects, publications, repos, build] = await Promise.all([
      loadJSON("/data/profile.json"),
      loadJSON("/data/projects.json"),
      loadJSON("/data/publications.json"),
      loadJSON("/data/repos.json", true),
      loadJSON("/data/build.json", true),
    ]);
    state.profile = profile;
    state.projects = projects;
    state.publications = publications;
    state.repos = repos;
    state.build = build;
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.atzI18n?.dict) boot();
    else document.addEventListener("atzingen:lang", () => {
      if (!state.profile) boot();
      else renderAll();
    }, { once: false });
  });
})();
