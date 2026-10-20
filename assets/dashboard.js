/* ============================================================
   Panel de analítica + generador de QR
   ============================================================ */
(function () {
  "use strict";

  var C = window.HUB_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var COLUMNS = ["server_ts", "ts", "type", "vid", "sid", "src", "utm_medium", "utm_campaign",
    "link_id", "link_url", "t_to_click_ms", "dwell_ms", "clicks", "new_visitor",
    "device", "os", "browser", "lang", "tz", "screen", "ref", "country", "city", "page", "node"];
  var DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  function safeLS() { try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; } catch (e) { return null; } }
  var LS = safeLS();

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function fmtInt(n) { return Math.round(n).toLocaleString("es-CO"); }
  function fmtPct(x) { return isFinite(x) ? (x * 100).toFixed(x < 0.1 && x > 0 ? 1 : 0) + "%" : "—"; }
  function fmtDur(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var s = ms / 1000;
    if (s < 60) return s.toFixed(s < 10 ? 1 : 0) + " s";
    var m = Math.floor(s / 60);
    return m + " min " + Math.round(s % 60) + " s";
  }
  function median(arr) {
    if (!arr.length) return null;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function lookup(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }
  // mismo criterio que tracker.js: id o alias, sin distinguir mayúsculas
  function norm(v) { return String(v || "").trim().toLowerCase(); }
  function resolveId(list, id) {
    var n = norm(id);
    if (!n) return String(id || "");
    for (var i = 0; i < (list || []).length; i++) {
      var it = list[i];
      if (norm(it.id) === n || (it.aliases || []).some(function (a) { return norm(a) === n; })) return it.id;
    }
    return String(id);
  }
  var SPECIAL = { directo: "Directo (sin QR)", referido: "Desde otro sitio web" };
  function srcLabel(id) { var s = lookup(C.sources, id); return s ? s.label : (SPECIAL[id] || id || "—"); }
  function linkLabel(id) { var l = lookup(C.links, id); return l ? l.label : ({ "sello-beca": "Sello beca 66%", "salidas-campo": "Salidas de campo", "recorrido-360": "Recorrido 360" })[id] || (id || "—"); }
  function licInfo(id) { return lookup(C.programs, id); }
  function licLabel(id) { var p = licInfo(id); return p ? p.name : (id ? id : "Sin licenciatura (selector)"); }
  function licColor(id) { var p = licInfo(id); return p && p.color ? p.color : "#c9c4b6"; }

  // ---------------- vista previa del origen ----------------
  // colores del afiche; fijos en ambos temas porque el texto encima siempre es oscuro
  var PH_COLORS = ["#e9a63a", "#f4c3cb", "#4cc27f", "#a9bbf7"];
  var SPECIAL_TYPE = { directo: "Sin QR", referido: "Web" };
  function srcInfo(id) {
    var s = lookup(C.sources, id), i = (C.sources || []).indexOf(s);
    return {
      id: id, label: srcLabel(id), image: s && s.image ? s.image : "",
      type: s ? (s.type || "Origen") : (SPECIAL_TYPE[id] || "Origen"),
      place: s ? (s.place || "") : (id === "directo" ? "Enlace abierto sin parámetro ?src" : id === "referido" ? "Llegaron desde otra página web" : "No está en config.js"),
      color: i >= 0 ? PH_COLORS[i % PH_COLORS.length] : "#e6e1d4"
    };
  }
  // imagen de la pieza o, si no hay, un bloque de color con el formato
  function originVisual(info, opts) {
    opts = opts || {};
    if (info.image) {
      var img = el("img", opts.cls || null);
      img.src = info.image; img.alt = "Vista previa: " + info.label;
      return img;
    }
    var ph = el("div", opts.mini ? opts.cls + " ph-mini" : "ph" + (opts.cls ? " " + opts.cls : ""));
    ph.style.background = info.color;
    ph.setAttribute("aria-hidden", "true");
    if (opts.mini) { ph.textContent = info.type.charAt(0); return ph; }
    ph.textContent = info.type;
    var sm = el("small", null, opts.hint || "sin vista previa");
    ph.appendChild(sm);
    return ph;
  }

  // ---------------- tooltip ----------------
  var tip = $("#tip");
  function showTip(e, strong, sub) {
    tip.textContent = "";
    tip.appendChild(el("strong", null, strong));
    if (sub) tip.appendChild(el("span", null, sub));
    tip.hidden = false;
    var x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    var y = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function bindTip(node, strong, sub) {
    node.tabIndex = 0;
    node.addEventListener("pointermove", function (e) { showTip(e, strong, sub); });
    node.addEventListener("pointerleave", function () { tip.hidden = true; });
    node.addEventListener("focus", function () {
      var r = node.getBoundingClientRect();
      showTip({ clientX: r.right, clientY: r.top }, strong, sub);
    });
    node.addEventListener("blur", function () { tip.hidden = true; });
  }

  // ---------------- pestañas ----------------
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) {
        var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-selected", on);
      });
      ["analytics", "qr", "config"].forEach(function (t) { $("#tab-" + t).hidden = b.dataset.tab !== t; });
      if (b.dataset.tab === "qr") buildQR();
      if (b.dataset.tab === "config" && window.QREditor) QREditor.open();
      if (history.replaceState) history.replaceState(null, "", b.dataset.tab === "analytics" ? location.pathname : "#" + b.dataset.tab);
    });
  });
  // abrir directamente una pestaña con #qr o #config
  setTimeout(function () {
    var t = location.hash.slice(1), btn = t && document.querySelector('.tab[data-tab="' + t + '"]');
    if (btn) btn.click();
  }, 0);
  $("#hubName").textContent = C.title ? "Nodo: " + C.title : "";

  // ================================================================
  //   CARGA DE DATOS
  // ================================================================
  var state = { events: [], mode: null };

  function normalize(raw) {
    return raw.map(function (r) {
      var t = new Date(r.ts || r.server_ts);
      if (isNaN(t)) t = new Date(r.server_ts);
      return {
        t: t, type: String(r.type || ""), vid: String(r.vid || ""), sid: String(r.sid || ""),
        src: resolveId(C.sources, r.src || "directo"), campaign: String(r.utm_campaign || ""),
        node: resolveId(C.programs, r.node),
        link: resolveId(C.links, r.link_id), ttc: r.t_to_click_ms === "" || r.t_to_click_ms == null ? null : Number(r.t_to_click_ms),
        dwell: r.dwell_ms === "" || r.dwell_ms == null ? null : Number(r.dwell_ms),
        isNew: Number(r.new_visitor) === 1,
        device: r.device || "Otro", os: r.os || "Otro", browser: r.browser || "Otro",
        lang: String(r.lang || "").split("-")[0] || "?", country: r.country || "", city: r.city || "",
        ref: r.ref || "", raw: r
      };
    }).filter(function (e) { return !isNaN(e.t) && e.sid; })
      .sort(function (a, b) { return a.t - b.t; });
  }

  function setStatus(msg) { $("#status").textContent = msg; }

  function loaded(raw, mode, label) {
    state.events = normalize(raw);
    state.mode = mode;
    setStatus(label + " · " + fmtInt(state.events.length) + " eventos");
    $("#dash").hidden = false;
    $("#dash").classList.remove("is-loading");
    fillFilters();
    render();
  }

  var keyInput = $("#key");
  if (LS && LS.getItem("qrhub_key")) { keyInput.value = LS.getItem("qrhub_key"); $("#remember").checked = true; }

  function loadRemote() {
    if (!C.endpoint) { setStatus("Falta el endpoint en config.js. Mientras tanto usa «Datos de prueba» o «Ver demo»."); return; }
    var key = keyInput.value.trim();
    if (!key) { setStatus("Escribe la clave de lectura."); keyInput.focus(); return; }
    if (LS) { if ($("#remember").checked) LS.setItem("qrhub_key", key); else LS.removeItem("qrhub_key"); }
    setStatus("Descargando…");
    $("#dash").classList.add("is-loading");
    fetch(C.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "read", key: key })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error === "auth" ? "Clave incorrecta." : "Error del servidor: " + j.error);
      loaded(j.events, "remote", "Google Sheets");
    }).catch(function (err) {
      $("#dash").classList.remove("is-loading");
      setStatus("No se pudo cargar: " + err.message);
    });
  }
  $("#loadRemote").addEventListener("click", loadRemote);
  keyInput.addEventListener("keydown", function (e) { if (e.key === "Enter") loadRemote(); });
  $("#refresh").addEventListener("click", function () {
    if (state.mode === "remote") loadRemote();
    else if (state.mode === "local") $("#loadLocal").click();
    else render();
  });

  $("#loadLocal").addEventListener("click", function () {
    var arr = [];
    try { arr = JSON.parse((LS && LS.getItem("qrhub_events")) || "[]"); } catch (e) {}
    if (!arr.length) { setStatus("No hay eventos locales. Abre index.html (con ?src=prueba) en este navegador y haz clic en algún enlace."); return; }
    loaded(arr, "local", "Datos locales de este navegador");
  });

  $("#loadDemo").addEventListener("click", function () { loaded(demoData(), "demo", "Datos de demostración (ficticios)"); });

  // ================================================================
  //   FILTROS
  // ================================================================
  function fillSelect(sel, items, allLabel) {
    var prev = sel.value;
    sel.textContent = "";
    var o = el("option", null, allLabel); o.value = ""; sel.appendChild(o);
    items.forEach(function (it) { var op = el("option", null, it[1]); op.value = it[0]; sel.appendChild(op); });
    sel.value = items.some(function (it) { return it[0] === prev; }) ? prev : "";
  }
  function fillFilters() {
    var srcs = {}, devs = {}, lics = {};
    (C.programs || []).forEach(function (p) { lics[p.id] = 1; });
    state.events.forEach(function (e) { srcs[e.src] = 1; devs[e.device] = 1; if (e.node) lics[e.node] = 1; });
    var order = (C.programs || []).map(function (p) { return p.id; });
    fillSelect($("#fLic"), Object.keys(lics).sort(function (a, b) { return (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99); })
      .map(function (l) { return [l, licLabel(l)]; }), "Todas");
    fillSelect($("#fSrc"), Object.keys(srcs).sort().map(function (s) { return [s, srcLabel(s)]; }), "Todos");
    fillSelect($("#fDev"), Object.keys(devs).sort().map(function (d) { return [d, d]; }), "Todos");
  }
  ["#fRange", "#fLic", "#fSrc", "#fDev"].forEach(function (s) { $(s).addEventListener("change", render); });

  function filtered(ignoreSrc) {
    var range = $("#fRange").value, src = ignoreSrc ? "" : $("#fSrc").value, dev = $("#fDev").value, lic = $("#fLic").value;
    var from = 0;
    if (range !== "all") {
      var d = new Date(); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (Number(range) - 1));
      from = d.getTime();
    }
    return state.events.filter(function (e) {
      return e.t.getTime() >= from && (!src || e.src === src) && (!dev || e.device === dev) && (!lic || e.node === lic);
    });
  }

  // ================================================================
  //   CÁLCULO DE SESIONES
  // ================================================================
  function sessionsOf(evts) {
    var map = {};
    evts.forEach(function (e) {
      var s = map[e.sid];
      if (!s) s = map[e.sid] = { sid: e.sid, vid: e.vid, start: e.t, src: e.src, device: e.device, os: e.os,
        browser: e.browser, lang: e.lang, country: e.country, city: e.city, isNew: e.isNew,
        links: [], firstLink: "", dwell: null, ttc: null, direct: false, visits: 0, node: "" };
      if (e.node) s.node = e.node;   // la licenciatura elegida (si pasó por el selector, la última)
      if (e.type === "visit") { s.visits++; if (e.link) s.direct = true; }
      if (e.type === "click") {
        s.links.push(e.link);
        if (!s.firstLink) s.firstLink = e.link;
        if (e.ttc != null && (s.ttc == null || e.ttc < s.ttc)) s.ttc = e.ttc;
      }
      if (e.type === "exit" && e.dwell != null) s.dwell = Math.max(s.dwell || 0, e.dwell);
      if (e.isNew) s.isNew = true;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function countBy(list, fn) {
    var m = {};
    list.forEach(function (x) { var k = fn(x); if (k == null || k === "") return; m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  // ================================================================
  //   RENDER
  // ================================================================
  var lineChart = null;

  function render() {
    var evts = filtered();
    var S = sessionsOf(evts);
    var clicks = evts.filter(function (e) { return e.type === "click"; });
    renderKPIs(evts, S, clicks);
    renderLine(evts, S, clicks);
    renderPrograms(S);
    renderOrigins(S);
    renderSources(S);
    renderLinks(S, clicks);
    renderFlow(S);
    renderHours(S);
    renderDwell(S);
    barList($("#device"), countBy(S, function (s) { return s.device; }), S.length);
    barList($("#os"), countBy(S, function (s) { return s.os; }), S.length);
    barList($("#browser"), countBy(S, function (s) { return s.browser; }), S.length);
    barList($("#lang"), countBy(S, function (s) { return s.lang; }), S.length);
    var geo = countBy(S, function (s) { return s.country ? (s.city ? s.city + ", " : "") + s.country : null; });
    if (geo.length) barList($("#geo"), geo, S.length);
    else { $("#geo").textContent = ""; $("#geo").appendChild(el("p", "empty", "Activa geo: true en config.js para ver país y ciudad.")); }
    renderRecent(evts);
  }

  function renderKPIs(evts, S, clicks) {
    var box = $("#kpis"); box.textContent = "";
    var visitors = {}, newV = {};
    S.forEach(function (s) { visitors[s.vid] = 1; if (s.isNew) newV[s.vid] = 1; });
    var nVis = Object.keys(visitors).length;
    var conv = S.filter(function (s) { return s.links.length; }).length;
    var dw = S.map(function (s) { return s.dwell; }).filter(function (x) { return x != null && !isNaN(x); });
    var tc = S.map(function (s) { return s.ttc; }).filter(function (x) { return x != null && !isNaN(x); });
    var direct = S.filter(function (s) { return s.direct; }).length;
    var items = [
      ["Sesiones (escaneos)", fmtInt(S.length), fmtInt(evts.filter(function (e) { return e.type === "visit"; }).length) + " cargas de página"],
      ["Visitantes únicos", fmtInt(nVis), fmtPct(nVis ? Object.keys(newV).length / nVis : NaN) + " nuevos"],
      ["Clics de salida", fmtInt(clicks.length), direct ? fmtInt(direct) + " por redirección directa" : "desde el nodo"],
      ["Conversión", fmtPct(S.length ? conv / S.length : NaN), fmtPct(S.length ? 1 - conv / S.length : NaN) + " salieron sin elegir"],
      ["Permanencia", fmtDur(median(dw)), "mediana de tiempo visible"],
      ["Tiempo hasta el clic", fmtDur(median(tc)), "mediana"]
    ];
    items.forEach(function (it) {
      var k = el("div", "kpi");
      k.appendChild(el("div", "k-label", it[0]));
      k.appendChild(el("div", "k-value", it[1]));
      k.appendChild(el("div", "k-sub", it[2]));
      box.appendChild(k);
    });
  }

  function dayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function renderLine(evts, S, clicks) {
    var range = $("#fRange").value;
    var end = new Date(); end.setHours(0, 0, 0, 0);
    var start = new Date(end);
    if (range === "all") { if (evts.length) { start = new Date(evts[0].t); start.setHours(0, 0, 0, 0); } }
    else start.setDate(start.getDate() - (Number(range) - 1));
    var days = [], idx = {};
    for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { idx[dayKey(d)] = days.length; days.push(new Date(d)); }
    var ses = days.map(function () { return 0; }), clk = days.map(function () { return 0; });
    S.forEach(function (s) { var i = idx[dayKey(s.start)]; if (i != null) ses[i]++; });
    clicks.forEach(function (c) { var i = idx[dayKey(c.t)]; if (i != null) clk[i]++; });
    var labels = days.map(function (x) { return x.toLocaleDateString("es-CO", { day: "numeric", month: "short" }); });

    var c1 = css("--series-1"), c2 = css("--series-2"), ink2 = css("--ink-2"), grid = css("--grid");
    var lg = $("#lineLegend"); lg.textContent = "";
    [["Sesiones", c1], ["Clics de salida", c2]].forEach(function (p) {
      var s = el("span"); var i = el("i"); i.style.background = p[1]; s.appendChild(i); s.appendChild(document.createTextNode(p[0])); lg.appendChild(s);
    });

    var data = {
      labels: labels,
      datasets: [
        { label: "Sesiones", data: ses, borderColor: c1, backgroundColor: c1, borderWidth: 2, pointRadius: days.length > 45 ? 0 : 2, pointHoverRadius: 5, cubicInterpolationMode: "monotone" },
        { label: "Clics de salida", data: clk, borderColor: c2, backgroundColor: c2, borderWidth: 2, pointRadius: days.length > 45 ? 0 : 2, pointHoverRadius: 5, cubicInterpolationMode: "monotone" }
      ]
    };
    var opts = {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: css("--surface"), titleColor: css("--ink"), bodyColor: css("--ink"), borderColor: css("--line"), borderWidth: 1, padding: 10, usePointStyle: true, boxHeight: 2, boxWidth: 12 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: ink2, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, border: { color: grid } },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: ink2, precision: 0, maxTicksLimit: 6 } }
      }
    };
    if (!window.Chart) return;
    Chart.defaults.font.family = css("--sans");
    if (lineChart) lineChart.destroy();
    lineChart = new Chart($("#lineChart"), { type: "line", data: data, options: opts });
  }

  function headRow(table, cols) {
    var tr = el("tr");
    cols.forEach(function (c) { var th = el("th", c[1] ? "num" : null, c[0]); tr.appendChild(th); });
    var thead = el("thead"); thead.appendChild(tr); table.appendChild(thead);
  }
  function cell(tr, text, num) { var td = el("td", num ? "num" : null, text); tr.appendChild(td); return td; }

  // ---------------- tabla por licenciatura ----------------
  function renderPrograms(S) {
    var t = $("#licTable"); t.textContent = "";
    var groups = {};
    (C.programs || []).forEach(function (p) { groups[p.id] = []; });
    S.forEach(function (s) { (groups[s.node] = groups[s.node] || []).push(s); });
    var rows = Object.keys(groups).map(function (k) { return [k, groups[k]]; })
      .filter(function (r) { return r[0] || r[1].length; })
      .sort(function (a, b) { return b[1].length - a[1].length; });
    if (!rows.length) { t.appendChild(emptyRow()); return; }
    var pensumIds = (C.links || []).filter(function (l) { return l.type === "pensum"; }).map(function (l) { return l.id; });
    // asesoría = WhatsApp o cita (Teams/Bookings)
    var waIds = (C.links || []).filter(function (l) { return l.type === "whatsapp" || /bookings|teams|asesor/i.test((l.url || "") + " " + l.id); }).map(function (l) { return l.id; });
    headRow(t, [["Licenciatura"], ["Sesiones", 1], ["Conversión", 1], ["Pensum", 1], ["Asesoría", 1], ["Enlace favorito"], ["Origen principal"]]);
    var max = Math.max(1, rows[0][1].length), tb = el("tbody");
    rows.forEach(function (r) {
      var list = r[1], tr = el("tr");
      tr.className = "clickable";
      var conv = list.filter(function (s) { return s.links.length; }).length;
      var pens = list.filter(function (s) { return s.links.some(function (l) { return pensumIds.indexOf(l) >= 0; }); }).length;
      var wa = list.filter(function (s) { return s.links.some(function (l) { return waIds.indexOf(l) >= 0; }); }).length;
      var fav = countBy(list, function (s) { return s.firstLink; })[0];
      var top = countBy(list, function (s) { return s.src; })[0];
      var name = cell(tr, ""), w = el("span", "cell-src"), dot = el("span", "lic-dot");
      dot.style.background = licColor(r[0]);
      w.appendChild(dot); w.appendChild(el("span", null, licLabel(r[0]))); name.appendChild(w);
      var n = cell(tr, fmtInt(list.length), 1);
      var bar = el("span", "inbar"); bar.style.width = Math.max(2, 60 * list.length / max) + "px"; n.appendChild(bar);
      cell(tr, list.length ? fmtPct(conv / list.length) : "—", 1);
      cell(tr, fmtInt(pens), 1);
      cell(tr, fmtInt(wa), 1);
      cell(tr, fav ? linkLabel(fav[0]) : "—");
      cell(tr, top ? srcLabel(top[0]) : "—");
      if (r[0]) tr.addEventListener("click", function () {
        var sel = $("#fLic");
        if (!Array.prototype.some.call(sel.options, function (o) { return o.value === r[0]; })) { var o = el("option", null, licLabel(r[0])); o.value = r[0]; sel.appendChild(o); }
        sel.value = sel.value === r[0] ? "" : r[0];
        render();
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  function groupBySrc(S) {
    var groups = {};
    (C.sources || []).forEach(function (s) { groups[s.id] = []; });   // también los que aún no tienen escaneos
    S.forEach(function (s) { (groups[s.src] = groups[s.src] || []).push(s); });
    return Object.keys(groups).map(function (k) { return [k, groups[k]]; })
      .sort(function (a, b) { return b[1].length - a[1].length; });
  }

  // nombre del origen con su miniatura (tablas y mapa de flujo)
  function srcCell(node, id) {
    var info = srcInfo(id), wrap = el("span", "cell-src");
    wrap.appendChild(originVisual(info, { cls: "mini-thumb", mini: true }));
    wrap.appendChild(el("span", null, info.label));
    node.textContent = "";
    node.appendChild(wrap);
    node.title = id;
    return node;
  }

  function renderOrigins(S) {
    var box = $("#origins"); box.textContent = "";
    var rows = groupBySrc(S);
    var max = Math.max(1, rows.length ? rows[0][1].length : 1);
    rows.forEach(function (r, i) {
      var info = srcInfo(r[0]), list = r[1];
      var conv = list.filter(function (s) { return s.links.length; }).length;
      var card = el("button", "origin-card");
      card.type = "button";
      card.setAttribute("aria-label", info.label + ": " + list.length + " sesiones. Ver detalle");
      var th = el("div", "thumb");
      th.appendChild(originVisual(info));
      if (list.length) th.appendChild(el("span", "rank", String(i + 1).padStart(2, "0")));
      card.appendChild(th);
      var body = el("div", "o-body");
      body.appendChild(el("span", "eyebrow", info.type));
      body.appendChild(el("span", "o-title", info.label));
      body.appendChild(el("span", "o-place", info.place || " "));
      var st = el("div", "o-stats");
      st.appendChild(el("span", "o-big", fmtInt(list.length)));
      st.appendChild(el("span", "o-unit", list.length === 1 ? "sesión" : "sesiones"));
      var cv = el("span", "o-conv"); cv.appendChild(el("b", null, list.length ? fmtPct(conv / list.length) : "—")); cv.appendChild(document.createTextNode("conversión"));
      st.appendChild(cv);
      body.appendChild(st);
      var bar = el("div", "o-bar"), fill = el("i"); fill.style.width = (100 * list.length / max) + "%"; bar.appendChild(fill);
      body.appendChild(bar);
      card.appendChild(body);
      card.addEventListener("click", function () { openOrigin(r[0]); });
      box.appendChild(card);
    });
  }

  // ---------------- ficha de detalle de un origen ----------------
  var dlg = $("#originDlg"), dlgSrc = "";
  function openOrigin(id) {
    dlgSrc = id;
    var info = srcInfo(id);
    var evts = filtered(true).filter(function (e) { return e.src === id; });
    var list = sessionsOf(evts);
    var media = $("#dlgMedia"); media.textContent = "";
    var vis = originVisual(info, { hint: "Agrega image: en config.js" });
    media.appendChild(vis);
    if (info.image) {
      vis.addEventListener("click", function () { window.open(info.image, "_blank", "noopener"); });
      var a = el("a", null, "Abrir en tamaño completo ↗"); a.href = info.image; a.target = "_blank"; a.rel = "noopener";
      media.appendChild(a);
    }
    $("#dlgType").textContent = info.type;
    $("#dlgTitle").textContent = info.label;
    $("#dlgPlace").textContent = info.place;
    $("#dlgId").textContent = "?src=" + id;

    var visitors = {}; list.forEach(function (s) { visitors[s.vid] = 1; });
    var conv = list.filter(function (s) { return s.links.length; }).length;
    var mob = list.filter(function (s) { return s.device === "Móvil"; }).length;
    var k = $("#dlgKpis"); k.textContent = "";
    [["Sesiones", fmtInt(list.length)], ["Visitantes", fmtInt(Object.keys(visitors).length)],
     ["Conversión", list.length ? fmtPct(conv / list.length) : "—"],
     ["Permanencia", fmtDur(median(list.map(function (s) { return s.dwell; }).filter(function (x) { return x != null; })))],
     ["Hasta el clic", fmtDur(median(list.map(function (s) { return s.ttc; }).filter(function (x) { return x != null; })))],
     ["Desde móvil", list.length ? fmtPct(mob / list.length) : "—"]].forEach(function (p) {
      var d = el("div"); d.appendChild(el("b", null, p[1])); d.appendChild(document.createTextNode(p[0])); k.appendChild(d);
    });

    var dest = countBy(list, function (s) { return s.firstLink ? linkLabel(s.firstLink) : "Abandono (sin elegir)"; });
    barList($("#dlgLinks"), dest, list.length, false, "Abandono (sin elegir)");
    barList($("#dlgDevices"), countBy(list, function (s) { return s.device + " · " + s.os; }), list.length);
    var last = evts.length ? evts[evts.length - 1].t : null;
    $("#dlgLast").textContent = last ? "Último escaneo: " + last.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "Sin escaneos en este periodo.";
    drawQR($("#dlgQr"), buildUrl(defaultBase(), id, "", "", $("#fLic").value));
    tip.hidden = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  $("#dlgClose").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });   // clic en el fondo
  $("#dlgFilter").addEventListener("click", function () {
    var sel = $("#fSrc");
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === dlgSrc; })) {
      var o = el("option", null, srcLabel(dlgSrc)); o.value = dlgSrc; sel.appendChild(o);
    }
    sel.value = dlgSrc;
    dlg.close();
    render();
    $("#kpis").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#dlgDownload").addEventListener("click", function () { downloadQR($("#dlgQr"), srcLabel(dlgSrc), "qr-" + dlgSrc); });

  function renderSources(S) {
    var t = $("#srcTable"); t.textContent = "";
    var groups = {};
    S.forEach(function (s) { (groups[s.src] = groups[s.src] || []).push(s); });
    var rows = Object.keys(groups).map(function (k) { return [k, groups[k]]; }).sort(function (a, b) { return b[1].length - a[1].length; });
    if (!rows.length) { t.appendChild(emptyRow()); return; }
    headRow(t, [["Punto de entrada"], ["Sesiones", 1], ["Visitantes", 1], ["Conversión", 1], ["Enlace favorito"], ["Permanencia", 1], ["Móvil", 1]]);
    var max = rows[0][1].length, tb = el("tbody");
    rows.forEach(function (r) {
      var list = r[1], tr = el("tr");
      var vis = {}; list.forEach(function (s) { vis[s.vid] = 1; });
      var conv = list.filter(function (s) { return s.links.length; }).length;
      var fav = countBy(list, function (s) { return s.firstLink; })[0];
      var dw = median(list.map(function (s) { return s.dwell; }).filter(function (x) { return x != null; }));
      var mob = list.filter(function (s) { return s.device === "Móvil"; }).length;
      srcCell(cell(tr, ""), r[0]);
      var n = cell(tr, fmtInt(list.length), 1);
      var bar = el("span", "inbar"); bar.style.width = Math.max(2, 60 * list.length / max) + "px"; n.appendChild(bar);
      cell(tr, fmtInt(Object.keys(vis).length), 1);
      cell(tr, fmtPct(conv / list.length), 1);
      cell(tr, fav ? linkLabel(fav[0]) : "—");
      cell(tr, fmtDur(dw), 1);
      cell(tr, fmtPct(mob / list.length), 1);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  function renderLinks(S, clicks) {
    var t = $("#linkTable"); t.textContent = "";
    var by = {};
    clicks.forEach(function (c) { (by[c.link] = by[c.link] || []).push(c); });
    // incluye enlaces sin clics para ver los que nadie usa
    (C.links || []).forEach(function (l) { if (!by[l.id]) by[l.id] = []; });
    var rows = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1].length - a[1].length; });
    if (!rows.length) { t.appendChild(emptyRow()); return; }
    headRow(t, [["Enlace"], ["Clics", 1], ["% de clics", 1], ["% de sesiones", 1], ["Tiempo hasta clic", 1], ["Principal entrada"]]);
    var tb = el("tbody"), max = Math.max(1, rows[0][1].length), total = clicks.length || 1;
    rows.forEach(function (r) {
      var list = r[1], tr = el("tr");
      var sess = S.filter(function (s) { return s.links.indexOf(r[0]) >= 0; }).length;
      var top = countBy(list, function (c) { return c.src; })[0];
      cell(tr, linkLabel(r[0]));
      var n = cell(tr, fmtInt(list.length), 1);
      var bar = el("span", "inbar"); bar.style.width = Math.max(2, 60 * list.length / max) + "px"; bar.style.background = css("--series-2"); n.appendChild(bar);
      cell(tr, fmtPct(list.length / total), 1);
      cell(tr, fmtPct(S.length ? sess / S.length : NaN), 1);
      cell(tr, fmtDur(median(list.map(function (c) { return c.ttc; }).filter(function (x) { return x != null; }))), 1);
      cell(tr, top ? srcLabel(top[0]) : "—");
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  function emptyRow() { var tb = el("tbody"), tr = el("tr"), td = el("td", "empty", "Sin datos en este periodo."); tr.appendChild(td); tb.appendChild(tr); return tb; }

  // v en [0,1] → paso de la rampa secuencial; el texto elige tinta según la luminancia del fondo
  function heatColor(v) {
    var step = v <= 0 ? 0 : Math.min(7, 1 + Math.floor(v * 6.999));
    var bg = css("--s" + step), m = /^#?(\w\w)(\w\w)(\w\w)$/.exec(bg), lum = 1;
    if (m) lum = (0.2126 * parseInt(m[1], 16) + 0.7152 * parseInt(m[2], 16) + 0.0722 * parseInt(m[3], 16)) / 255;
    return { bg: bg, ink: lum < 0.55 ? "#ffffff" : "#0b0b0b" };
  }

  function renderFlow(S) {
    var t = $("#flow"); t.textContent = "";
    var srcs = countBy(S, function (s) { return s.src; }).map(function (x) { return x[0]; });
    var linkIds = (C.links || []).map(function (l) { return l.id; });
    S.forEach(function (s) { s.links.forEach(function (l) { if (linkIds.indexOf(l) < 0) linkIds.push(l); }); });
    if (!srcs.length) { t.appendChild(emptyRow()); return; }
    var cols = linkIds.concat(["__none"]);
    var tr = el("tr"); tr.appendChild(el("th"));
    cols.forEach(function (c) { tr.appendChild(el("th", null, c === "__none" ? "Abandono" : linkLabel(c))); });
    var thead = el("thead"); thead.appendChild(tr); t.appendChild(thead);
    var tb = el("tbody"), maxP = 0;
    var grid = srcs.map(function (sr) {
      var list = S.filter(function (s) { return s.src === sr; });
      var ns = cols.map(function (c) {
        var n = list.filter(function (s) { return c === "__none" ? !s.links.length : s.links.indexOf(c) >= 0; }).length;
        if (n / list.length > maxP) maxP = n / list.length;
        return n;
      });
      return [sr, list, ns];
    });
    grid.forEach(function (g) {
      var sr = g[0], list = g[1];
      var row = el("tr"); row.appendChild(srcCell(el("th", "row"), sr));
      cols.forEach(function (c, ci) {
        var n = g[2][ci], p = n / list.length;
        var td = el("td", null, fmtPct(p));
        var col = heatColor(maxP ? p / maxP : 0);
        td.style.background = col.bg;
        td.style.color = col.ink;
        bindTip(td, fmtInt(n) + " de " + fmtInt(list.length) + " sesiones", srcLabel(sr) + " → " + (c === "__none" ? "abandono" : linkLabel(c)));
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
  }

  function renderHours(S) {
    var t = $("#hours"); t.textContent = "";
    var m = []; for (var i = 0; i < 7; i++) { m.push(new Array(24).fill(0)); }
    var max = 0;
    S.forEach(function (s) { var d = (s.start.getDay() + 6) % 7, h = s.start.getHours(); m[d][h]++; if (m[d][h] > max) max = m[d][h]; });
    var tr = el("tr"); tr.appendChild(el("th"));
    for (var h = 0; h < 24; h++) tr.appendChild(el("th", null, h % 3 === 0 ? String(h) : ""));
    var thead = el("thead"); thead.appendChild(tr); t.appendChild(thead);
    var tb = el("tbody");
    m.forEach(function (row, d) {
      var r = el("tr"); r.appendChild(el("th", "row", DAYS[d]));
      row.forEach(function (v, h) {
        var td = el("td", null, String(v));
        td.style.background = heatColor(max ? v / max : 0).bg;
        bindTip(td, fmtInt(v) + " sesiones", DAYS[d] + " " + h + ":00–" + h + ":59");
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    t.appendChild(tb);
  }

  function renderDwell(S) {
    var buckets = [["< 5 s", 0, 5e3], ["5–15 s", 5e3, 15e3], ["15–30 s", 15e3, 30e3], ["30–60 s", 30e3, 60e3], ["1–3 min", 60e3, 180e3], ["> 3 min", 180e3, Infinity]];
    var with_ = S.filter(function (s) { return s.dwell != null; });
    var rows = buckets.map(function (b) { return [b[0], with_.filter(function (s) { return s.dwell >= b[1] && s.dwell < b[2]; }).length]; });
    barList($("#dwell"), rows, with_.length, true);
  }

  function barList(box, rows, total, keepOrder, mutedLabel) {
    box.textContent = "";
    if (!total || !rows.length) { box.appendChild(el("p", "empty", "Sin datos en este periodo.")); return; }
    if (!keepOrder && rows.length > 6) {
      var rest = rows.slice(5).reduce(function (a, r) { return a + r[1]; }, 0);
      rows = rows.slice(0, 5).concat([["Otros", rest]]);
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    rows.forEach(function (r) {
      var row = el("div", "bar-row" + (r[0] === mutedLabel ? " is-muted" : ""));
      var lab = el("div", "b-label"); lab.appendChild(el("span", null, r[0])); row.appendChild(lab);
      var track = el("div", "b-track"), fill = el("div", "b-fill");
      fill.style.width = (100 * r[1] / max) + "%"; track.appendChild(fill); row.appendChild(track);
      row.appendChild(el("span", "b-val", fmtInt(r[1])));
      row.appendChild(el("span", "b-pct", fmtPct(r[1] / total)));
      bindTip(row, fmtInt(r[1]) + " sesiones", r[0] + " · " + fmtPct(r[1] / total));
      box.appendChild(row);
    });
  }

  var TYPE_LABEL = { visit: "Entrada", click: "Clic", exit: "Salida" };
  function renderRecent(evts) {
    var t = $("#recent"); t.textContent = "";
    headRow(t, [["Fecha"], ["Evento"], ["Licenciatura"], ["Entrada"], ["Enlace"], ["Dispositivo"], ["Navegador"], ["Permanencia", 1], ["Sesión"]]);
    var tb = el("tbody");
    evts.slice(-150).reverse().forEach(function (e) {
      var tr = el("tr");
      cell(tr, e.t.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" }));
      var td = cell(tr, ""); td.appendChild(el("span", "pill", TYPE_LABEL[e.type] || e.type));
      cell(tr, e.node ? licLabel(e.node) : "—");
      cell(tr, srcLabel(e.src));
      cell(tr, e.link ? linkLabel(e.link) : (e.type === "exit" ? "(sin elegir)" : ""));
      cell(tr, e.device + " · " + e.os);
      cell(tr, e.browser);
      cell(tr, e.dwell != null ? fmtDur(e.dwell) : "", 1);
      cell(tr, e.sid.slice(0, 6));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  // ---------------- exportar CSV ----------------
  $("#csv").addEventListener("click", function () {
    var rows = filtered();
    var esc = function (v) { v = v == null ? "" : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [COLUMNS.join(",")].concat(rows.map(function (e) {
      return COLUMNS.map(function (c) { return esc(c === "ts" ? e.t.toISOString() : e.raw[c]); }).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qr-eventos-" + dayKey(new Date()) + ".csv";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  // ================================================================
  //   DEMO
  // ================================================================
  function demoData() {
    var rnd = mulberry(42);
    function pick(arr) { var tot = arr.reduce(function (a, x) { return a + x[1]; }, 0), r = rnd() * tot; for (var i = 0; i < arr.length; i++) { r -= arr[i][1]; if (r <= 0) return arr[i][0]; } return arr[0][0]; }
    var srcs = (C.sources || []).map(function (s, i) { return [s.id, [40, 25, 18, 10, 7, 5][i] || 5]; }).concat([["directo", 6]]);
    var links = (C.links || []).filter(function (l) { return !l.hidden; }).map(function (l, i) { return [l.id, [45, 25, 18, 12, 8][i] || 6]; });
    var out = [], visitors = [];
    var now = Date.now();
    for (var n = 0; n < 1800; n++) {
      var daysAgo = Math.floor(Math.pow(rnd(), 1.4) * 75);
      var dow = new Date(now - daysAgo * 864e5).getDay();
      var hour = pick([[8, 6], [9, 9], [10, 12], [11, 10], [12, 14], [13, 12], [14, 9], [15, 8], [16, 9], [17, 11], [18, 8], [19, 5], [20, 4], [21, 3], [7, 3], [22, 2]]);
      if ((dow === 0 || dow === 6) && rnd() < .6) continue;
      var t = new Date(now - daysAgo * 864e5); t.setHours(hour, Math.floor(rnd() * 60), Math.floor(rnd() * 60));
      if (t.getTime() > now) continue;
      var returning = visitors.length && rnd() < .22;
      var vid = returning ? visitors[Math.floor(rnd() * visitors.length)] : "v" + n;
      if (!returning) visitors.push(vid);
      var src = pick(srcs);
      var device = src === "correo" ? pick([["Escritorio", 6], ["Móvil", 4]]) : pick([["Móvil", 86], ["Tablet", 4], ["Escritorio", 10]]);
      var os = device === "Escritorio" ? pick([["Windows", 6], ["macOS", 4]]) : pick([["Android", 62], ["iOS", 38]]);
      var browser = os === "iOS" ? pick([["Safari", 8], ["Chrome", 1], ["Instagram (app)", 1]]) : os === "Android" ? pick([["Chrome", 7], ["Samsung Internet", 2], ["Instagram (app)", 1]]) : pick([["Chrome", 6], ["Edge", 2], ["Safari", 2]]);
      var progs = (C.programs || []).map(function (p, i) { return [p.id, [22, 9, 16, 7, 6, 8, 7, 14, 6][i] || 5]; });
      var node = progs.length ? pick(progs) : "";
      var common = { vid: vid, sid: "s" + n, src: src, node: node, new_visitor: returning ? 0 : 1, device: device, os: os, browser: browser,
        lang: pick([["es-CO", 80], ["es-419", 10], ["en-US", 8], ["pt-BR", 2]]), tz: "America/Bogota", screen: "390x844",
        country: "Colombia", city: pick([["Bogotá", 85], ["Chía", 6], ["Medellín", 5], ["Cali", 4]]), utm_campaign: "", ref: "", page: "index.html" };
      var convRate = { "afiche-biblioteca": .72, "volante-evento": .55, "pantalla-lobby": .38, "correo": .8 }[src] || .5;
      out.push(Object.assign({ type: "visit", ts: t.toISOString() }, common));
      var dwell;
      if (rnd() < convRate) {
        var ttc = Math.round(2500 + Math.pow(rnd(), 2) * 40000);
        var link = pick(links);
        out.push(Object.assign({ type: "click", ts: new Date(t.getTime() + ttc).toISOString(), link_id: link, t_to_click_ms: ttc, clicks: 1 }, common));
        dwell = ttc + 300;
        out.push(Object.assign({ type: "exit", ts: new Date(t.getTime() + dwell).toISOString(), link_id: link, dwell_ms: dwell, clicks: 1, t_to_click_ms: ttc }, common));
      } else {
        dwell = Math.round(1500 + Math.pow(rnd(), 2.2) * 120000);
        out.push(Object.assign({ type: "exit", ts: new Date(t.getTime() + dwell).toISOString(), link_id: "", dwell_ms: dwell, clicks: 0 }, common));
      }
    }
    return out;
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ================================================================
  //   VERIFICACIÓN: ¿algún cambio en config.js puede romper un QR?
  // ================================================================
  var ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
  function checkConfig(cfg) {
    if (cfg === undefined) cfg = window.HUB_CONFIG;
    var out = [];   // [nivel, título, detalle]
    if (!cfg) {
      out.push(["bad", "config.js no se pudo leer", "Probablemente tiene un error de escritura (una coma o comilla de más/menos). Mientras tanto la página pública muestra un botón de respaldo hacia el sitio de la Facultad."]);
      return out;
    }
    [["links", "enlace"], ["sources", "origen"], ["programs", "licenciatura"]].forEach(function (g) {
      var list = cfg[g[0]] || [], seen = {};
      list.forEach(function (it) {
        if (!it || !it.id) { out.push(["bad", "Hay un " + g[1] + " sin id", "Cada " + g[1] + " necesita un id fijo."]); return; }
        if (!ID_RE.test(it.id)) out.push(["warn", "El id «" + it.id + "» tiene mayúsculas, espacios o tildes", "Funciona, pero conviene usar solo minúsculas, números y guiones. Si ya está impreso, no lo cambies."]);
        [it.id].concat(it.aliases || []).forEach(function (k) {
          var n = norm(k);
          if (seen[n] && seen[n] !== it) out.push(["bad", "El id «" + k + "» está repetido en " + g[0], "Dos " + g[1] + "s con el mismo id o alias: los QR no sabrán a cuál ir. Cambia el que NO esté impreso."]);
          seen[n] = it;
        });
      });
    });
    var URL_OK = /^(https?:|mailto:|tel:)|^(?!\/)[\w.\/-]+\.html?(\?[^\s#]*)?(#[\w-]*)?$/i, progs = cfg.programs || [];
    (cfg.links || []).forEach(function (l) {
      if (!l || !l.id) return;
      var type = l.type || "url";
      if (type === "url" && !URL_OK.test(l.url || ""))
        out.push(["warn", "«" + (l.label || l.id) + "» no tiene una url válida", "No se mostrará en la página y los QR directos a él abrirán la página completa en su lugar."]);
      if (type === "whatsapp" && !String(l.phone || cfg.whatsapp || "").replace(/\D/g, ""))
        out.push(["warn", "Falta el número de WhatsApp", "El botón «" + (l.label || l.id) + "» no se mostrará hasta que pongas el número de asesoría."]);
      if (type === "page") {
        var sinPag = progs.filter(function (p) { return !URL_OK.test(p.page || ""); });
        if (sinPag.length) out.push(["warn", "Licenciaturas sin página oficial: " + sinPag.map(function (p) { return p.name || p.id; }).join(", "), "En su página no aparecerá el botón «" + (l.label || l.id) + "»."]);
        if (!URL_OK.test(cfg.facultyPage || "")) out.push(["warn", "Falta la página de la Facultad", "El botón «" + (l.label || l.id) + "» no aparecerá en la página principal."]);
      }
      if (type === "pensum") {
        var sin = progs.filter(function (p) { return !URL_OK.test(p.pensum || ""); });
        if (sin.length) out.push(["warn", "Licenciaturas sin pensum: " + sin.map(function (p) { return p.name || p.id; }).join(", "), "En su página no aparecerá el botón «" + (l.label || l.id) + "»."]);
      }
    });
    var hidden = (cfg.links || []).filter(function (l) { return l && l.hidden; });
    if (hidden.length) out.push(["good", hidden.length + " enlace(s) oculto(s): " + hidden.map(function (l) { return l.label || l.id; }).join(", "), "No aparecen en la página, pero sus QR directos (?to=) siguen funcionando."]);
    var al = (cfg.links || []).concat(cfg.sources || []).filter(function (x) { return x && x.aliases && x.aliases.length; });
    if (al.length) out.push(["good", "Alias activos: " + al.map(function (x) { return x.aliases.join(", ") + " → " + x.id; }).join(" · "), "Los QR con esos ids antiguos se cuentan y redirigen como los nuevos."]);
    if (!out.some(function (o) { return o[0] !== "good"; }))
      out.unshift(["good", "Todo en orden", "Ningún id repetido ni enlace roto. Puedes editar textos, destinos e imágenes sin afectar los QR."]);
    return out;
  }

  function renderHealth() {
    var res = checkConfig(), ul = $("#health"); ul.textContent = "";
    var ICON = { good: "✓", warn: "!", bad: "✕" };
    res.forEach(function (r) {
      var li = el("li", r[0]);
      li.appendChild(el("span", "ic", ICON[r[0]]));
      var d = el("div"); d.appendChild(el("b", null, r[1])); d.appendChild(el("small", null, r[2]));
      li.appendChild(d); ul.appendChild(li);
    });
    // imágenes de vista previa que no existen
    (C.sources || []).forEach(function (s) {
      if (!s.image) return;
      var img = new Image();
      img.onerror = function () {
        var li = el("li", "warn"); li.appendChild(el("span", "ic", "!"));
        var d = el("div"); d.appendChild(el("b", null, "No se encuentra la imagen de «" + s.label + "»"));
        d.appendChild(el("small", null, s.image + " — revisa el nombre del archivo en previews/. No afecta al QR."));
        li.appendChild(d); ul.appendChild(li);
      };
      img.src = s.image;
    });
    var bad = res.filter(function (r) { return r[0] === "bad"; });
    var b = $("#healthBanner");
    b.hidden = !bad.length;
    if (bad.length) {
      b.textContent = "";
      b.appendChild(el("b", null, "Atención:"));
      b.appendChild(el("span", null, bad[0][1] + (bad.length > 1 ? " (y " + (bad.length - 1) + " más)" : "") + "."));
      var go = el("button", "btn small", "Ver detalle");
      go.addEventListener("click", function () { document.querySelector('[data-tab="qr"]').click(); $("#health").scrollIntoView({ behavior: "smooth", block: "center" }); });
      b.appendChild(go);
    }
  }
  renderHealth();
  // lo usa el editor de configuración (editor.js)
  window.QRPanel = { checkConfig: checkConfig, buildUrl: buildUrl, defaultBase: defaultBase, drawQR: drawQR, refreshHealth: renderHealth };

  // ================================================================
  //   GENERADOR DE QR
  // ================================================================
  var qrBuilt = false;
  function defaultBase() {
    var u = location.href.split(/[?#]/)[0].replace(/dashboard\.html$/, "");
    return /^https?:/.test(u) ? u : "https://TU-USUARIO.github.io/TU-REPO/";
  }
  function buildUrl(base, src, to, camp, lic) {
    var u;
    try { u = new URL(base); } catch (e) { return ""; }
    if (lic) u.searchParams.set("lic", lic);
    if (src) u.searchParams.set("src", src);
    if (to) u.searchParams.set("to", to);
    if (camp) u.searchParams.set("utm_campaign", camp);
    return u.toString();
  }
  function drawQR(box, text) {
    box.textContent = "";
    if (!window.QRCode || !text) return;
    new QRCode(box, { text: text, width: 512, height: 512, correctLevel: QRCode.CorrectLevel.M, colorDark: "#000000", colorLight: "#ffffff" });
  }
  function downloadQR(box, caption, filename) {
    var src = box.querySelector("canvas");
    if (!src) return;
    var pad = 48, cap = caption ? 70 : 0;
    var c = document.createElement("canvas");
    c.width = src.width + pad * 2; c.height = src.height + pad * 2 + cap;
    var g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, pad, pad);
    if (caption) {
      g.fillStyle = "#111"; g.font = "600 30px system-ui, sans-serif"; g.textAlign = "center";
      g.fillText(caption, c.width / 2, src.height + pad + 46, c.width - pad * 2);
    }
    var a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = filename + ".png";
    a.click();
  }

  function buildQR() {
    if (qrBuilt) return;
    qrBuilt = true;
    $("#qBase").value = defaultBase();
    var qSrc = $("#qSrc"), qTo = $("#qTo"), qLic = $("#qLic"), qAllLic = $("#qAllLic");
    [qLic, qAllLic].forEach(function (sel) {
      (C.programs || []).forEach(function (p) { var o = el("option", null, "Licenciatura en " + p.name + "  (" + p.id + ")"); o.value = p.id; sel.appendChild(o); });
      var on = el("option", null, "Ninguna: mostrar el selector de licenciaturas"); on.value = ""; sel.appendChild(on);
    });
    if ($("#fLic").value) qLic.value = qAllLic.value = $("#fLic").value;
    (C.sources || []).forEach(function (s) { var o = el("option", null, s.label + "  (" + s.id + ")"); o.value = s.id; qSrc.appendChild(o); });
    var oc = el("option", null, "Otro (escribir ID)…"); oc.value = "__custom"; qSrc.appendChild(oc);
    var oh = el("option", null, "Nodo divisor (mostrar todos los enlaces)"); oh.value = ""; qTo.appendChild(oh);
    (C.links || []).forEach(function (l) { var o = el("option", null, "Directo → " + l.label); o.value = l.id; qTo.appendChild(o); });

    function update() {
      $("#qCustomWrap").hidden = qSrc.value !== "__custom";
      var src = qSrc.value === "__custom" ? $("#qCustom").value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") : qSrc.value;
      var url = buildUrl($("#qBase").value.trim(), src, qTo.value, $("#qCamp").value.trim(), qLic.value);
      $("#qUrl").value = url;
      $("#qCaption").textContent = [qLic.value ? "Lic. en " + licLabel(qLic.value) : "", src ? srcLabel(src) : ""].filter(Boolean).join(" · ");
      drawQR($("#qrBox"), url);
      showOrigin(src);
    }

    // vista previa de la pieza donde irá el QR (imagen de config.js o una de prueba local)
    var tempImg = {};
    function showOrigin(src) {
      var info = srcInfo(src || "nuevo");
      if (tempImg[src]) info.image = tempImg[src].url;
      var f = $("#qOrigin"); f.textContent = "";
      f.appendChild(originVisual(info, { hint: "sube una imagen para verla aquí" }));
      var hint = $("#qImgHint");
      if (tempImg[src]) hint.textContent = "Solo en esta pestaña. Para conservarla, copia «" + tempImg[src].name + "» a previews/ y agrega image: \"previews/" + tempImg[src].name + "\" a este origen en config.js.";
      else if (info.image) hint.textContent = info.image;
      else hint.textContent = "Este origen aún no tiene imagen en config.js.";
    }
    $("#qImg").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var src = qSrc.value === "__custom" ? $("#qCustom").value.trim() : qSrc.value;
      if (tempImg[src]) URL.revokeObjectURL(tempImg[src].url);
      tempImg[src] = { url: URL.createObjectURL(file), name: file.name.replace(/\s+/g, "-") };
      this.value = "";
      showOrigin(src);
    });
    ["#qBase", "#qCustom", "#qCamp"].forEach(function (s) { $(s).addEventListener("input", update); });
    [qSrc, qTo, qLic].forEach(function (s) { s.addEventListener("change", update); });
    $("#qCopy").addEventListener("click", function () {
      var v = $("#qUrl").value;
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { $("#qCopy").textContent = "¡Copiado!"; setTimeout(function () { $("#qCopy").textContent = "Copiar"; }, 1400); });
    });
    $("#qDownload").addEventListener("click", function () {
      var src = qSrc.value === "__custom" ? $("#qCustom").value.trim() : qSrc.value;
      downloadQR($("#qrBox"), $("#qCaption").textContent, "qr-" + (qLic.value ? qLic.value + "-" : "") + (src || "nodo") + (qTo.value ? "-" + qTo.value : ""));
    });
    update();

    var grid = $("#qrAll");
    function buildAll() {
      grid.textContent = "";
      (C.sources || []).forEach(function (s) {
        var info = srcInfo(s.id);
        var item = el("div", "qr-item"), mini = el("div", "mini"), meta = el("div", "meta"), box = el("div", "qrbox");
        mini.appendChild(originVisual(info, { hint: " " }));
        item.appendChild(mini);
        meta.appendChild(el("span", "eyebrow", info.type));
        meta.appendChild(el("strong", null, s.label));
        if (info.place) meta.appendChild(el("span", "o-place", info.place));
        var lic = qAllLic.value;
        meta.appendChild(el("code", null, (lic ? "?lic=" + lic + "&" : "?") + "src=" + s.id));
        var row = el("div", "row");
        row.appendChild(box);
        var b = el("button", "btn small", "Descargar PNG");
        var cap = [lic ? "Lic. en " + licLabel(lic) : "", s.label].filter(Boolean).join(" · ");
        b.addEventListener("click", function () { downloadQR(box, cap, "qr-" + (lic ? lic + "-" : "") + s.id); });
        row.appendChild(b);
        meta.appendChild(row);
        item.appendChild(meta);
        grid.appendChild(item);
        drawQR(box, buildUrl($("#qBase").value.trim(), s.id, "", "", lic));
      });
    }
    $("#qBase").addEventListener("change", buildAll);
    qAllLic.addEventListener("change", buildAll);
    buildAll();
  }
})();
