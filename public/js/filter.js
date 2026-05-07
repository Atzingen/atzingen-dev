/* atzingen.dev — filter
 * Listens for clicks on .area-pill and .lang-pill (open-source section)
 * and filters .project-card and .repo-table rows accordingly. Also wires
 * the search input and the "active in last 12 months" checkbox.
 */

(function () {
  "use strict";

  const state = {
    area: "all",
    repoLang: "*",
    repoSearch: "",
    repoRecentOnly: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function applyAreaFilter() {
    $$(".project-card").forEach((card) => {
      const areas = (card.dataset.areas || "").split(" ").filter(Boolean);
      const show = state.area === "all" || areas.includes(state.area);
      card.toggleAttribute("hidden", !show);
    });
    $$(".area-pill").forEach((b) => b.classList.toggle("is-active", b.dataset.area === state.area));
  }

  function applyRepoFilters() {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const q = state.repoSearch.toLowerCase().trim();

    let visible = 0;
    $$(".repo-table tbody tr").forEach((tr) => {
      const lang = tr.dataset.lang || "";
      const updated = Date.parse(tr.dataset.updated || "");
      const text = tr.textContent.toLowerCase();
      const matchLang = state.repoLang === "*" || lang === state.repoLang;
      const matchSearch = !q || text.includes(q);
      const matchRecent = !state.repoRecentOnly || (updated && updated >= cutoff);
      const show = matchLang && matchSearch && matchRecent;
      tr.toggleAttribute("hidden", !show);
      if (show) visible++;
    });
    const empty = $(".repo-empty");
    if (empty) empty.toggleAttribute("hidden", visible !== 0);
    $$(".lang-pill").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.langFilter === state.repoLang));
  }

  function init() {
    document.addEventListener("click", (ev) => {
      const area = ev.target.closest(".area-pill");
      if (area) {
        state.area = area.dataset.area;
        applyAreaFilter();
        return;
      }
      const lang = ev.target.closest(".lang-pill");
      if (lang) {
        state.repoLang = lang.dataset.langFilter;
        applyRepoFilters();
        return;
      }
    });

    const search = $("#repo-search");
    if (search) {
      search.addEventListener("input", (ev) => {
        state.repoSearch = ev.target.value;
        applyRepoFilters();
      });
    }
    const recent = $("#repo-recent");
    if (recent) {
      recent.addEventListener("change", (ev) => {
        state.repoRecentOnly = ev.target.checked;
        applyRepoFilters();
      });
    }

    document.addEventListener("atzingen:lang", () => {
      // pills re-rendered by main.js; reapply current state
      requestAnimationFrame(() => {
        applyAreaFilter();
        applyRepoFilters();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
