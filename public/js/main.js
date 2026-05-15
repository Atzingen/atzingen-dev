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
    const quickium = p.roles.find((r) => r.id === "quickium");
    const eduItems = p.education.map((e) =>
      el("div", { class: "hl-edu-row" }, [
        el("b", {}, e.level),
        el("span", {}, ` ${e.field} · ${e.inst} (${e.year})`),
      ]),
    );
    const hl = el("ul", { class: "highlights" }, [
      el("li", {}, [
        el("span", { class: "key" }, lang() === "pt" ? "Formação" : "Education"),
        el("div", { class: "hl-value hl-stack" }, eduItems),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, lang() === "pt" ? "Base" : "Based in"),
        el("span", { class: "hl-value" }, p.base + " · Brasil"),
      ]),
      quickium ? el("li", {}, [
        el("span", { class: "key" }, "Quickium"),
        el("a", { class: "hl-value", href: quickium.url, target: "_blank", rel: "noopener" }, "quickium.com"),
      ]) : null,
      el("li", {}, [
        el("span", { class: "key" }, "Lattes"),
        el("a", { class: "hl-value", href: p.contact.lattes, target: "_blank", rel: "noopener" }, "lattes.cnpq.br/5173282107514295"),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, "LinkedIn"),
        el("a", { class: "hl-value", href: p.contact.linkedin, target: "_blank", rel: "noopener" }, "/in/gustavoatzingen"),
      ]),
      el("li", {}, [
        el("span", { class: "key" }, "GitHub"),
        el("a", { class: "hl-value", href: p.contact.github[0].url, target: "_blank", rel: "noopener" }, "@" + p.contact.github[0].label),
      ]),
    ].filter(Boolean));
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
    const list = $("[data-bind='projects.unified']");
    if (!list) return;
    list.innerHTML = "";

    const featured = state.projects.featured.slice(0, 5);
    const featuredNames = new Set(featured.map((p) => p.name));

    featured.forEach((p) => {
      const repo = findRepo(p.name, p.org);
      const stars = repo?.stars ?? 0;
      const lng = repo?.language || (p.stack && p.stack[0]) || "—";
      const updated = repo?.updatedAt || "";
      const item = el("li", {
        class: "proj-item proj-featured",
        "data-name": p.name.toLowerCase(),
        "data-desc": (pick(p.summary) || "").toLowerCase(),
        "data-lang": lng,
        "data-updated": updated,
        "data-areas": (p.areas || []).join(" "),
      }, [
        el("div", { class: "proj-head" }, [
          el("h3", { class: "proj-name" },
            el("a", { href: p.url, target: "_blank", rel: "noopener" }, p.name)),
          el("ul", { class: "proj-tags" },
            (p.areas || []).map((a) =>
              el("li", { class: "tag tag-area", "data-area": a }, a))),
        ]),
        el("p", { class: "proj-desc" }, pick(p.summary)),
        (p.stack || []).length ? el("ul", { class: "proj-stack" },
          (p.stack || []).map((s) => el("li", { class: "tag tag-mono" }, s))) : null,
        el("div", { class: "proj-meta" }, [
          el("span", { class: "proj-lang" }, lng),
          stars > 0 ? el("span", { class: "proj-stars" }, `★ ${stars}`) : null,
          updated ? el("span", { class: "proj-date" }, fmtDate(updated)) : null,
          el("a", {
            href: p.url, target: "_blank", rel: "noopener", class: "proj-link",
          }, "GitHub →"),
          p.demo ? el("a", {
            href: p.demo, target: "_blank", rel: "noopener", class: "proj-link",
          }, "demo →") : null,
        ]),
      ]);
      list.appendChild(item);
    });

    if (!state.repos) return;
    const compact = state.repos.repos
      .filter((r) => r.org === "Atzingen")
      .filter((r) => !featuredNames.has(r.name))
      .filter((r) => r.description && r.description.trim() !== "")
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    compact.forEach((r) => {
      const item = el("li", {
        class: "proj-item proj-compact",
        "data-name": r.name.toLowerCase(),
        "data-desc": (r.description || "").toLowerCase(),
        "data-lang": r.language || "",
        "data-updated": r.updatedAt || "",
      }, [
        el("a", {
          href: r.url, target: "_blank", rel: "noopener", class: "proj-name",
        }, r.name),
        el("span", { class: "proj-desc" }, r.description || ""),
        el("span", { class: "proj-meta" }, [
          el("span", { class: "proj-lang" }, r.language || "—"),
          r.stars > 0 ? el("span", { class: "proj-stars" }, `★ ${r.stars}`) : null,
          el("span", { class: "proj-date" }, fmtDate(r.updatedAt)),
        ]),
      ]);
      list.appendChild(item);
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
    // Build language pills from rendered .proj-item items (featured + compact).
    const langs = $("[data-bind='repos.languages']");
    if (!langs) return;
    langs.innerHTML = "";

    const items = $$(".proj-item");
    const counts = new Map();
    items.forEach((it) => {
      const l = it.dataset.lang;
      if (l && l !== "—") counts.set(l, (counts.get(l) || 0) + 1);
    });

    langs.appendChild(el("li", {}, el("button", {
      type: "button", class: "lang-pill is-active", "data-lang-filter": "*",
    }, lang() === "pt" ? "todas" : "all")));

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
    document.dispatchEvent(new CustomEvent("atzingen:rendered"));
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

  // ---------- scroll-spy: highlight active nav link ----------

  function initScrollSpy() {
    const navLinks = $$(".nav a[href^='#']");
    if (!navLinks.length) return;
    const sections = navLinks
      .map((a) => ({ link: a, target: document.querySelector(a.getAttribute("href")) }))
      .filter((p) => p.target);
    if (!sections.length) return;

    let activeHash = null;
    const setActive = (hash) => {
      if (hash === activeHash) return;
      activeHash = hash;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === hash));
    };

    // The active section is the last one whose top has crossed an anchor line near the top
    // of the viewport. Below that anchor, no section is active (we're still in the hero).
    const ANCHOR_OFFSET = 120; // px below the topbar
    const update = () => {
      const anchor = ANCHOR_OFFSET;
      let current = null;
      for (const { link, target } of sections) {
        const top = target.getBoundingClientRect().top;
        if (top - anchor <= 0) current = link;
        else break;
      }
      setActive(current ? current.getAttribute("href") : null);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    // Re-evaluate after data loads (sections may grow).
    document.addEventListener("atzingen:rendered", update);

    // Manual click sets active immediately, before scroll animation.
    navLinks.forEach((a) => {
      a.addEventListener("click", () => setActive(a.getAttribute("href")));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.atzI18n?.dict) boot();
    else document.addEventListener("atzingen:lang", () => {
      if (!state.profile) boot();
      else renderAll();
    }, { once: false });
    initScrollSpy();
  });
})();
