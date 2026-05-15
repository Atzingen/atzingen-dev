/* atzingen.dev — filter
 * Single unified filter for the .project-list inside #projetos.
 * - search box: filters by name/description text
 * - recent toggle: keep only repos updated in the last 12 months
 * - language pills: keep only the chosen primary language
 * - area pills (from #areas section): filter featured items by curated area;
 *   compact items are not constrained by area (they have no curated areas).
 */

(function () {
  "use strict";

  const state = {
    area: "all",
    lang: "*",
    search: "",
    recent: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function applyFilters() {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const q = state.search.toLowerCase().trim();

    let visible = 0;
    $$(".proj-item").forEach((item) => {
      const isFeatured = item.classList.contains("proj-featured");
      const itemLang = item.dataset.lang || "";
      const itemUpdated = Date.parse(item.dataset.updated || "");
      const itemAreas = (item.dataset.areas || "").split(" ").filter(Boolean);
      const itemText = ((item.dataset.name || "") + " " + (item.dataset.desc || "")).toLowerCase();

      const matchLang = state.lang === "*" || itemLang === state.lang;
      const matchSearch = !q || itemText.includes(q);
      const matchRecent = !state.recent || (itemUpdated && itemUpdated >= cutoff);
      // Area constraints only apply to curated featured items.
      const matchArea = state.area === "all" || !isFeatured || itemAreas.includes(state.area);

      const show = matchLang && matchSearch && matchRecent && matchArea;
      item.toggleAttribute("hidden", !show);
      if (show) visible++;
    });

    const empty = $(".repo-empty");
    if (empty) empty.toggleAttribute("hidden", visible !== 0);

    $$(".area-pill").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.area === state.area));
    $$(".lang-pill").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.langFilter === state.lang));
  }

  function init() {
    document.addEventListener("click", (ev) => {
      const area = ev.target.closest(".area-pill");
      if (area) {
        state.area = area.dataset.area;
        applyFilters();
        return;
      }
      const lang = ev.target.closest(".lang-pill");
      if (lang) {
        state.lang = lang.dataset.langFilter;
        applyFilters();
        return;
      }
    });

    const search = $("#repo-search");
    if (search) {
      search.addEventListener("input", (ev) => {
        state.search = ev.target.value;
        applyFilters();
      });
    }
    const recent = $("#repo-recent");
    if (recent) {
      recent.addEventListener("change", (ev) => {
        state.recent = ev.target.checked;
        applyFilters();
      });
    }

    document.addEventListener("atzingen:rendered", () => {
      applyFilters();
    });
    document.addEventListener("atzingen:lang", () => {
      // pills get re-rendered on language change; reapply current state next frame
      requestAnimationFrame(applyFilters);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
