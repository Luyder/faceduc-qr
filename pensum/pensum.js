/* ============================================================
   Pensum interactivo: ver.html?p=artes carga data/artes.js
   - Escritorio: tablero por áreas y semestres (como el diseño en Figma).
   - Celular: un semestre a la vez.
   - Al tocar un curso: ficha con descripción, créditos y requisitos,
     y se resaltan en el tablero los cursos relacionados.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var q = new URLSearchParams(location.search);
  var slug = (q.get("p") || "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) { fail("No se indicó qué pensum mostrar."); return; }

  var s = document.createElement("script");
  s.src = "data/" + slug + ".js?v=20261020n";
  s.onload = function () { window.PENSUM ? init(window.PENSUM) : fail("El pensum no tiene datos."); };
  s.onerror = function () { fail("Este pensum todavía no está disponible."); };
  document.head.appendChild(s);

  function fail(msg) {
    $("#board").appendChild(el("p", "pen-error", msg));
  }

  var P, byId = {}, after = {}, mobile = window.matchMedia("(max-width: 820px)"), sem = 1, selected = null;

  function init(data) {
    P = data;
    var root = document.documentElement.style;
    root.setProperty("--lic", P.color);
    root.setProperty("--lic-ink", P.ink || darken(P.color, 4.5));
    root.setProperty("--lic-display", darken(P.color, 3));
    root.setProperty("--on-lic", contrast(rgb(P.color), [255, 255, 255]) >= 2.6 ? "#fff" : "#141414");
    document.title = "Plan de estudios · " + P.program;
    var t = $("#title"); t.textContent = "";
    t.appendChild(document.createTextNode("Licenciatura "));
    t.appendChild(el("em", null, "en " + P.name));
    $("#sub").textContent = "Plan de estudios · " + P.semesters + " semestres · " + P.credits + " créditos";
    $("#source").textContent = (P.source || "") + (P.snies ? " · SNIES " + P.snies : "");

    P.courses.forEach(function (c) { byId[c.id] = c; });
    P.courses.forEach(function (c) { (c.pre || []).forEach(function (p) { (after[p] = after[p] || []).push(c.id); }); });

    buildTabs();
    buildBoard();
    buildNotes();
    mobile.addEventListener ? mobile.addEventListener("change", applySem) : mobile.addListener(applySem);
    applySem();

    // abrir un curso desde la URL (#educ2011)
    var h = location.hash.slice(1);
    if (h && byId[h]) open(h);
  }

  // ---------- color: contraste sobre el papel crema ----------
  function rgb(h) { var n = parseInt(String(h).replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(c) { c = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function darken(h, min) {
    var c = rgb(h), paper = [247, 244, 236];
    for (var i = 0; i < 25 && contrast(c, paper) < min; i++) c = c.map(function (v) { return v * 0.9; });
    return "#" + c.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("");
  }

  function areaOf(c) {
    if (c.area === P.langs.id) return P.langs;
    for (var i = 0; i < P.areas.length; i++) if (P.areas[i].id === c.area) return P.areas[i];
    return { name: "", color: "#555", bg: "#eee" };
  }

  // ---------------- tablero ----------------
  function card(c) {
    var a = areaOf(c);
    var b = el("button", "card" + (c.kind === "requisito" ? " req" : ""));
    b.type = "button";
    b.dataset.id = c.id; b.dataset.sem = c.sem;
    b.style.setProperty("--ac", a.color);
    b.style.gridColumn = String(c.sem + 1);
    b.style.gridRow = String(c.row);
    if (c.img) {
      var th = el("img", "c-img"); th.src = c.img; th.alt = ""; th.decoding = "async";   // fotos livianas (≈20 KB): carga inmediata
      b.appendChild(th); b.classList.add("has-img");
    }
    b.appendChild(el("span", "c-name", c.short));
    if (c.code) b.appendChild(el("span", "c-code", c.code));
    if (c.credits != null) b.appendChild(el("span", "c-cr", String(c.credits)));
    b.appendChild(el("span", "c-tag"));
    var label = c.name + (c.code ? ", " + c.code : "") + (c.credits != null ? ", " + c.credits + " créditos" : "") + ", semestre " + c.sem;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", function () { open(c.id); });
    return b;
  }

  function buildBoard() {
    var board = $("#board"); board.textContent = "";
    // encabezado de semestres
    var head = el("div", "row sems");
    head.appendChild(el("span", "lbl"));
    for (var i = 1; i <= P.semesters; i++) {
      var pill = el("span", "sem-pill", "Semestre " + i);
      pill.style.gridColumn = String(i + 1);
      head.appendChild(pill);
    }
    board.appendChild(head);

    P.areas.concat([P.langs]).forEach(function (a) {
      var band = el("div", "row band");
      band.dataset.area = a.id;
      band.style.setProperty("--ac", a.color);
      band.style.setProperty("--bg", a.bg);
      var lbl = el("div", "lbl");
      lbl.appendChild(el("h3", null, a.name));
      if (a.credits) lbl.appendChild(el("span", null, a.credits + " créditos"));
      lbl.style.gridRow = "1 / span " + (a.rows || 1);
      band.appendChild(lbl);
      P.courses.filter(function (c) { return c.area === a.id; }).forEach(function (c) { band.appendChild(card(c)); });
      if (a === P.langs) board.appendChild(totalsRow());
      board.appendChild(band);
    });
  }

  function totalsRow() {
    var r = el("div", "row band totals");
    var lbl = el("div", "lbl"); lbl.appendChild(el("h3", null, "Total")); lbl.appendChild(el("span", null, P.credits + " créditos"));
    r.appendChild(lbl);
    P.totals.forEach(function (t, i) {
      var n = el("span", "tot", String(t)); n.dataset.sem = i + 1; n.style.gridColumn = String(i + 2);
      n.setAttribute("aria-label", "Semestre " + (i + 1) + ": " + t + " créditos");
      r.appendChild(n);
    });
    return r;
  }

  function buildTabs() {
    var nav = $("#semTabs"); nav.textContent = "";
    for (var i = 1; i <= P.semesters; i++) (function (n) {
      var b = el("button", "sem-tab", String(n));
      b.type = "button"; b.dataset.sem = n;
      b.setAttribute("aria-label", "Semestre " + n);
      b.addEventListener("click", function () { sem = n; applySem(); });
      nav.appendChild(b);
    })(i);
    nav.appendChild(el("span", "sem-total", ""));
  }

  // en celular solo se ve el semestre elegido
  function applySem() {
    var m = mobile.matches;
    document.querySelectorAll(".sem-tab").forEach(function (b) {
      var on = Number(b.dataset.sem) === sem;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    $(".sem-total").textContent = "Semestre " + sem + " · " + P.totals[sem - 1] + " créditos";
    document.querySelectorAll(".card").forEach(function (c) { c.classList.toggle("off", m && Number(c.dataset.sem) !== sem); });
    document.querySelectorAll(".band").forEach(function (b) {
      if (b.classList.contains("totals")) { b.classList.toggle("empty", m); return; }
      var any = b.querySelector(".card:not(.off)");
      b.classList.toggle("empty", m && !any);
    });
  }

  function buildNotes() {
    var ol = $("#notes"); ol.textContent = "";
    var seen = {};
    P.courses.forEach(function (c) {
      (c.notes || []).forEach(function (n) {
        if (seen[n]) return; seen[n] = 1;
        var li = el("li"); li.appendChild(el("b", null, c.name + ": ")); li.appendChild(document.createTextNode(n)); ol.appendChild(li);
      });
    });
  }

  // ---------------- selección y ficha ----------------
  function related(id) {
    var c = byId[id];
    return { before: c.pre || [], along: c.co || [], after: after[id] || [] };
  }

  function highlight(id) {
    var board = $("#board");
    document.querySelectorAll(".card").forEach(function (n) { n.classList.remove("sel", "before", "along", "after"); n.querySelector(".c-tag").textContent = ""; });
    if (!id) { board.classList.remove("focus"); return; }
    board.classList.add("focus");
    var r = related(id);
    mark(id, "sel", "");
    r.before.forEach(function (x) { mark(x, "before", "antes"); });
    r.along.forEach(function (x) { mark(x, "along", "a la par"); });
    r.after.forEach(function (x) { mark(x, "after", "después"); });
  }
  function mark(id, cls, tag) {
    var n = document.querySelector('.card[data-id="' + id + '"]');
    if (!n) return;
    n.classList.add(cls);
    n.querySelector(".c-tag").textContent = tag;
  }

  var lastFocus = null;
  function open(id) {
    var c = byId[id]; if (!c) return;
    selected = id;
    if (mobile.matches && c.sem !== sem) { sem = c.sem; applySem(); }
    highlight(id);
    var a = areaOf(c);
    var sheet = $("#sheet");
    sheet.style.setProperty("--ac", a.color);
    sheet.style.setProperty("--bg", a.bg);
    $("#sArea").textContent = a.name;
    $("#sTitle").textContent = c.name;
    $("#sMeta").textContent = [c.code, c.credits != null ? c.credits + (c.credits === 1 ? " crédito" : " créditos") : "", "Semestre " + c.sem].filter(Boolean).join(" · ");

    var media = $("#sMedia");
    media.textContent = "";
    media.hidden = !c.img;
    if (c.img) { var im = el("img"); im.src = c.img; im.alt = "Foto del curso " + c.name; media.appendChild(im); }
    var body = $("#sBody"); body.textContent = "";
    if (c.desc) c.desc.split(/\n+/).forEach(function (p) { if (p.trim()) body.appendChild(el("p", null, p.trim())); });
    else body.appendChild(el("p", "muted", "Pronto agregaremos la descripción de este curso."));

    var r = related(id);
    group(body, "Necesitas haber cursado", r.before, "before");
    group(body, "Se cursa a la par con", r.along, "along");
    group(body, "Te habilita para", r.after, "after");

    if ((c.notes || []).length) {
      var box = el("div", "s-notes");
      c.notes.forEach(function (n) { box.appendChild(el("p", null, n)); });
      body.appendChild(box);
    }
    if (c.link) {
      var l = el("a", "s-link", c.link.label + " ↗");
      l.href = c.link.url; l.target = "_blank"; l.rel = "noopener";
      body.appendChild(l);
    }

    var wrap = $("#sheetWrap");
    if (wrap.hidden) lastFocus = document.activeElement;
    wrap.hidden = false;
    body.scrollTop = 0;
    document.body.classList.add("sheet-open");
    $("#sClose").focus();
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }

  function group(body, title, ids, cls) {
    if (!ids.length) return;
    body.appendChild(el("h4", null, title));
    var w = el("div", "chips");
    ids.forEach(function (x) {
      var c = byId[x]; if (!c) return;
      var b = el("button", "chip " + cls);
      b.type = "button";
      b.appendChild(el("span", null, c.short));
      b.appendChild(el("small", null, "Sem. " + c.sem));
      b.addEventListener("click", function () { open(x); });
      w.appendChild(b);
    });
    body.appendChild(w);
  }

  function close() {
    var wrap = $("#sheetWrap");
    if (wrap.hidden) return;
    wrap.hidden = true;
    document.body.classList.remove("sheet-open");
    highlight(null);
    selected = null;
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $("#sClose").addEventListener("click", close);
  $("#sheetWrap").addEventListener("click", function (e) { if (e.target === e.currentTarget) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
