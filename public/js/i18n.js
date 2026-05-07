/* atzingen.dev — i18n
 * Loads /data/i18n.json, applies translations to nodes carrying:
 *   data-i18n           → element.textContent
 *   data-i18n-placeholder → element.placeholder
 *   data-i18n-aria      → element.setAttribute("aria-label", ...)
 * Persists choice in localStorage["atzingen.lang"].
 *
 * Exposes window.atzI18n with: get(key), setLang(lang), lang, dict.
 * Fires a "atzingen:lang" event after each language switch so other
 * scripts (main.js) can re-render localised content.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "atzingen.lang";
  const SUPPORTED = ["pt", "en"];

  function detectInitialLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || "pt").toLowerCase();
    return nav.startsWith("en") ? "en" : "pt";
  }

  const state = {
    lang: detectInitialLang(),
    dict: null,
  };

  function applyTranslations() {
    if (!state.dict) return;
    const t = state.dict[state.lang] || {};
    document.documentElement.lang = state.lang === "pt" ? "pt-br" : "en";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (t[key] !== undefined) el.placeholder = t[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.dataset.i18nAria;
      if (t[key] !== undefined) el.setAttribute("aria-label", t[key]);
    });

    document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
      btn.querySelector("[data-lang-pt]")?.classList.toggle("active", state.lang === "pt");
      btn.querySelector("[data-lang-en]")?.classList.toggle("active", state.lang === "en");
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    state.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
    document.dispatchEvent(new CustomEvent("atzingen:lang", { detail: { lang } }));
  }

  async function init() {
    try {
      const res = await fetch("/data/i18n.json", { cache: "no-cache" });
      state.dict = await res.json();
    } catch (err) {
      console.error("[i18n] failed to load /data/i18n.json", err);
      return;
    }
    applyTranslations();
    document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setLang(state.lang === "pt" ? "en" : "pt");
      });
    });
    document.dispatchEvent(new CustomEvent("atzingen:lang", { detail: { lang: state.lang } }));
  }

  window.atzI18n = {
    get lang() { return state.lang; },
    get dict() { return state.dict; },
    get: (key) => (state.dict?.[state.lang] || {})[key],
    setLang,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
