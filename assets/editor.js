/* ============================================================
   Editor visual de config.js (pestaña «Configurar»)
   - Los id ya existentes quedan bloqueados 🔒: están en QR impresos.
   - Renombrar mueve el id viejo a "aliases"; borrar un botón primero lo oculta.
   - Guarda: en este computador (servir.py) · en GitHub (API) · o descarga el archivo.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function norm(v) { return String(v || "").trim().toLowerCase(); }
  function slug(v) {
    return String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }
  var ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
  var URL_RE = /^(https?:|mailto:|tel:)|^(?!\/)[\w.\/-]+\.html?(\?[^\s#]*)?(#[\w-]*)?$/i;
  var LS = (function () { try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; } catch (e) { return null; } })();

  var DEFAULTS = {
    title: "", subtitle: "", avatar: "", accent: "#2347c5", endpoint: "", geo: false,
    privacyNote: "", whatsapp: "", facultyPage: "", badge: { show: false }, programs: [], links: [], sources: []
  };
  function all(cfg) { return (cfg.links || []).concat(cfg.sources || [], cfg.programs || []); }

  var baseline, draft, locked, pending = {}, built = false, previewReady = false;

  function load() {
    baseline = Object.assign(clone(DEFAULTS), clone(window.HUB_CONFIG || {}));
    draft = clone(baseline);
    locked = lockedIds(baseline);
    pending = {};
  }
  // ids que pueden estar impresos: todos los guardados y sus alias
  function lockedIds(cfg) {
    var set = {};
    all(cfg).forEach(function (it) {
      if (!it) return;
      set[norm(it.id)] = 1;
      (it.aliases || []).forEach(function (a) { set[norm(a)] = 1; });
    });
    return set;
  }
  function isLocked(item) { return !!item.__wasSaved; }
  function markSaved(cfg) {
    all(cfg).forEach(function (it) { if (it) it.__wasSaved = true; });
  }

  // ================================================================
  //   GENERAR config.js (siempre con sintaxis válida)
  // ================================================================
  function cleanItem(it, keys) {
    var o = {};
    keys.forEach(function (k) {
      var v = it[k];
      if (v === undefined || v === null || v === "" || v === false) return;
      if (Array.isArray(v) && !v.length) return;
      o[k] = typeof v === "string" ? v.trim() : v;
    });
    return o;
  }
  function itemLine(o) {
    return "    { " + Object.keys(o).map(function (k) { return k + ": " + JSON.stringify(o[k]); }).join(", ") + " }";
  }
  function badgeLine(b) {
    b = b || {};
    var o = { show: b.show !== false };
    ["image", "line1", "big", "line2", "url", "label"].forEach(function (k) { if (b[k]) o[k] = String(b[k]).trim(); });
    return "{ " + Object.keys(o).map(function (k) { return k + ": " + JSON.stringify(o[k]); }).join(", ") + " }";
  }
  function generate(cfg) {
    var links = (cfg.links || []).map(function (l) {
      var type = l.type || "url";
      var keys = type === "url" ? ["id", "aliases", "label", "url", "icon", "embed", "hidden"]
        : type === "whatsapp" ? ["id", "aliases", "label", "type", "message", "phone", "icon", "hidden"]
        : type === "page" ? ["id", "aliases", "label", "type", "homeLabel", "icon", "embed", "hidden"]
        : ["id", "aliases", "label", "type", "icon", "embed", "hidden"];
      return itemLine(cleanItem(l, keys));
    });
    var programs = (cfg.programs || []).map(function (p) {
      var o = cleanItem(p, ["id", "aliases", "name", "tagline", "color", "snies", "semesters", "credits", "page", "pensum", "whatsappMessage"]);
      ["semesters", "credits"].forEach(function (k) { if (o[k] != null && /^\d+$/.test(String(o[k]))) o[k] = Number(o[k]); });
      return itemLine(o);
    });
    var sources = (cfg.sources || []).map(function (s) { return itemLine(cleanItem(s, ["id", "aliases", "label", "type", "place", "image"])); });
    var J = JSON.stringify;
    return [
      "/* ============================================================",
      "   CONFIGURACIÓN DEL NODO",
      "   Generado con el editor (dashboard.html ▸ Configurar). Puedes seguir",
      "   editándolo allí o a mano.",
      "",
      "   🔒 REGLA DE ORO: los QR impresos solo contienen la dirección del",
      "   nodo y los \"id\" (?lic=…&src=…&to=…). Por eso:",
      "     ✅ Puedes cambiar cuando quieras: textos, url de destino, íconos,",
      "        orden, colores, imágenes, lugares… Los QR siguen funcionando.",
      "     ⛔ NO cambies ni borres un \"id\" que ya esté impreso en un QR.",
      "        Si necesitas renombrarlo, pon el id viejo en \"aliases\".",
      "        Si un enlace ya no debe verse, usa hidden: true en vez de borrarlo.",
      "   ============================================================ */",
      "window.HUB_CONFIG = {",
      "  // Encabezado de la página pública",
      "  title: " + J(cfg.title || "") + ",",
      "  subtitle: " + J(cfg.subtitle || "") + ",",
      "  avatar: " + J(cfg.avatar || "") + ",                // logo redondo sobre el título. Vacío = sin logo",
      "  accent: " + J(cfg.accent || "#2347c5") + ",         // color de los números y del botón activo",
      "",
      "  // URL del Web App de Google Apps Script (ver README). Vacío = solo modo prueba en el navegador.",
      "  endpoint: " + J(cfg.endpoint || "") + ",",
      "",
      "  // Ubicación aproximada (país/ciudad) vía ipapi.co. No se guarda la IP.",
      "  geo: " + (cfg.geo ? "true" : "false") + ",",
      "",
      "  // Número de WhatsApp de asesoría (con indicativo, sin + ni espacios)",
      "  whatsapp: " + J(String(cfg.whatsapp || "").replace(/\D+/g, "")) + ",",
      "",
      "  // Página que abre el botón «Conoce…» en la página principal (sin licenciatura elegida)",
      "  facultyPage: " + J(cfg.facultyPage || "") + ",",
      "",
      "  // Sello como el de los folletos. show: false para ocultarlo",
      "  badge: " + badgeLine(cfg.badge) + ",",
      "",
      "  // Aviso breve de privacidad al pie de la página",
      "  privacyNote: " + J(cfg.privacyNote || "") + ",",
      "",
      "  // Licenciaturas: cada una es un nodo propio (?lic=ID).",
      "  //   id 🔒 fijo · name nombre tras «Licenciatura en» · color identidad · page página oficial · pensum plan de estudios",
      "  //   tagline texto bajo el título (el de la página oficial)",
      "  //   whatsappMessage (opcional) reemplaza el mensaje general de WhatsApp para esta licenciatura",
      "  programs: [",
      programs.join(",\n"),
      "  ],",
      "",
      "  // Botones de la página (los mismos para todas las licenciaturas).",
      "  //   id 🔒 fijo · label texto · icon emoji opcional · hidden oculto (QR directos siguen funcionando)",
      "  //   type \"url\" usa url · \"pensum\" pensum de la licenciatura · \"page\" su página oficial · \"whatsapp\" usa message ({programa} = nombre)",
      "  //   embed: true se abre dentro de la página · homeLabel texto en la página principal",
      "  //   aliases = ids antiguos que siguen llevando a este botón",
      "  links: [",
      links.join(",\n"),
      "  ],",
      "",
      "  // Orígenes: dónde está impreso cada QR (?src=ID).",
      "  //   id 🔒 fijo · label nombre · type formato · place ubicación · image vista previa en previews/",
      "  sources: [",
      sources.join(",\n"),
      "  ]",
      "};",
      ""
    ].join("\n");
  }

  // ================================================================
  //   UI
  // ================================================================
  function field(label, input, hint) {
    var f = el("label", "field");
    f.appendChild(el("span", null, label));
    f.appendChild(input);
    if (hint) f.appendChild(el("small", "hint", hint));
    return f;
  }
  function input(value, onInput, opts) {
    opts = opts || {};
    var i = el(opts.textarea ? "textarea" : "input");
    if (!opts.textarea) i.type = opts.type || "text";
    if (opts.placeholder) i.placeholder = opts.placeholder;
    if (opts.list) i.setAttribute("list", opts.list);
    if (opts.cls) i.className = opts.cls;
    if (opts.type === "checkbox") i.checked = !!value; else i.value = value == null ? "" : value;
    i.addEventListener(opts.type === "checkbox" || opts.type === "color" ? "change" : "input", function () {
      onInput(opts.type === "checkbox" ? i.checked : i.value, i);
      changed();
    });
    return i;
  }

  function renderGeneral() {
    var box = $("#edGeneral"); box.textContent = "";
    box.appendChild(field("Título", input(draft.title, function (v) { draft.title = v; })));
    box.appendChild(field("Subtítulo", input(draft.subtitle, function (v) { draft.subtitle = v; })));

    var av = el("div", "ed-avatar");
    var pv = el("div", "ed-avatar-pv");
    function paintAvatar() {
      pv.textContent = "";
      var src = pending[draft.avatar] ? pending[draft.avatar].dataUrl : draft.avatar;
      pv.classList.toggle("is-empty", !src);
      if (src) { var im = el("img"); im.src = src; im.alt = ""; pv.appendChild(im); }
      else pv.textContent = "Sin logo";
    }
    paintAvatar();
    av.appendChild(pv);
    var avBtns = el("div", "ed-avatar-btns");
    avBtns.appendChild(fileButton("Subir logo", function (img) {
      draft.avatar = "previews/avatar." + img.ext;
      pending[draft.avatar] = img;
      paintAvatar(); changed();
    }));
    var rm = el("button", "btn ghost small", "Quitar logo"); rm.type = "button";
    rm.addEventListener("click", function () { delete pending[draft.avatar]; draft.avatar = ""; paintAvatar(); changed(); });
    avBtns.appendChild(rm);
    av.appendChild(avBtns);
    box.appendChild(field("Logo (opcional, aparece redondo sobre el título)", av));

    box.appendChild(field("Color de acento (números y botón activo)", input(draft.accent || "#2347c5", function (v) { draft.accent = v; paintAvatar(); }, { type: "color", cls: "ed-color" })));
    box.appendChild(field("Aviso de privacidad (pie de página)", input(draft.privacyNote, function (v) { draft.privacyNote = v; }, { textarea: true })));

    var b = draft.badge = draft.badge || { show: false };
    var bw = el("div", "ed-badge");
    var sh = el("label", "check");
    sh.appendChild(input(b.show !== false, function (v) { b.show = v; }, { type: "checkbox" }));
    sh.appendChild(document.createTextNode(" Mostrar el sello (como el de los folletos)"));
    bw.appendChild(sh);
    var bg = el("div", "ed-grid progs");
    bg.appendChild(field("Línea de arriba", input(b.line1, function (v) { b.line1 = v; }, { placeholder: "¡Tenemos beca del" })));
    bg.appendChild(field("Grande", input(b.big, function (v) { b.big = v; }, { placeholder: "66%" })));
    bg.appendChild(field("Línea de abajo", input(b.line2, function (v) { b.line2 = v; }, { placeholder: "pregunta por ella" })));
    bw.appendChild(bg);
    var bu = input(b.url, function (v, n) { b.url = v.trim(); n.classList.toggle("is-invalid", !!v && !URL_RE.test(v.trim())); }, { type: "url", placeholder: "https://apoyofinanciero.uniandes.edu.co/decidi-ensenar" });
    bw.appendChild(field("Al tocar el sello abre", bu));
    bw.appendChild(field("Texto para lectores de pantalla", input(b.label, function (v) { b.label = v; }, { placeholder: "Beca Decidí Enseñar: 66% al ser admitido" })));
    box.appendChild(field("Sello", bw));
  }

  function idChip(item, list, kind) {
    var wrap = el("div", "ed-id");
    if (isLocked(item)) {
      wrap.appendChild(el("span", "chip", "🔒 " + item.id));
      var b = el("button", "linkbtn", "Renombrar"); b.type = "button";
      b.addEventListener("click", function () { renameId(item, list, kind); });
      wrap.appendChild(b);
    } else {
      var inp = input(item.id, function (v, node) {
        item.id = slug(v); item.__idTouched = true;
        if (node.value !== item.id) node.value = item.id;
      }, { cls: "ed-id-input", placeholder: "id" });
      wrap.appendChild(el("span", "chip new", "id nuevo"));
      wrap.appendChild(inp);
    }
    if (item.aliases && item.aliases.length) wrap.appendChild(el("span", "ed-alias", "También responde a: " + item.aliases.join(", ")));
    return wrap;
  }

  function uniqueId(base, list, self) {
    // ocupados: los demás elementos (y sus alias) y cualquier id que alguna vez estuvo guardado,
    // aunque se haya borrado, porque podría seguir impreso en un QR
    var taken = {};
    Object.keys(locked).forEach(function (k) { taken[k] = 1; });
    list.forEach(function (it) { if (it !== self) { taken[norm(it.id)] = 1; (it.aliases || []).forEach(function (a) { taken[norm(a)] = 1; }); } });
    base = base || (list === draft.links ? "enlace" : list === draft.programs ? "licenciatura" : "origen");
    var id = base, n = 2;
    while (taken[id]) id = base + "-" + n++;
    return id;
  }

  function renameId(item, list, kind) {
    var nv = prompt("Nuevo id para «" + (item.label || item.id) + "» (minúsculas, números y guiones).\n\nEl id actual «" + item.id + "» quedará como alias: los QR ya impresos seguirán funcionando.", item.id);
    if (nv == null) return;
    nv = slug(nv);
    if (!nv || nv === item.id) return;
    var clash = list.some(function (it) { return it !== item && (norm(it.id) === nv || (it.aliases || []).map(norm).includes(nv)); });
    if (clash) { toast("Ese id ya lo usa otro " + kind + ".", "bad"); return; }
    item.aliases = (item.aliases || []).filter(function (a) { return norm(a) !== nv; });
    if (item.aliases.indexOf(item.id) < 0) item.aliases.push(item.id);
    item.id = nv;
    changed(true);
  }

  function moveBtns(list, i) {
    var w = el("div", "ed-move");
    [["↑", -1, "Subir"], ["↓", 1, "Bajar"]].forEach(function (d) {
      var b = el("button", "iconbtn", d[0]); b.type = "button"; b.title = d[2]; b.setAttribute("aria-label", d[2]);
      b.disabled = (i + d[1] < 0) || (i + d[1] >= list.length);
      b.addEventListener("click", function () { var t = list[i]; list[i] = list[i + d[1]]; list[i + d[1]] = t; changed(true); });
      w.appendChild(b);
    });
    return w;
  }

  function renderLinks() {
    var box = $("#edLinks"); box.textContent = "";
    draft.links.forEach(function (l, i) {
      var row = el("div", "ed-item" + (l.hidden ? " is-hidden" : ""));
      row.appendChild(moveBtns(draft.links, i));
      var body = el("div", "ed-body");
      var g = el("div", "ed-grid links");
      g.appendChild(field("Ícono", input(l.icon, function (v) { l.icon = v; }, { cls: "ed-icon", placeholder: "🙂" })));
      g.appendChild(field("Texto del botón", input(l.label, function (v) {
        l.label = v;
        if (!isLocked(l) && !l.__idTouched) { l.id = uniqueId(slug(v), draft.links, l); var idi = row.querySelector(".ed-id-input"); if (idi) idi.value = l.id; }
      })));
      var type = l.type || "url";
      if (type === "url") {
        var urlIn = input(l.url, function (v, n) { l.url = v.trim(); n.classList.toggle("is-invalid", !!v && !URL_RE.test(v.trim())); }, { type: "url", placeholder: "https://…" });
        urlIn.classList.toggle("is-invalid", !!l.url && !URL_RE.test(l.url));
        g.appendChild(field("Destino (url)", urlIn, "Cambiarlo no afecta los QR impresos."));
      } else if (type === "whatsapp") {
        g.appendChild(field("Mensaje de WhatsApp", input(l.message, function (v) { l.message = v; }, { placeholder: "Hola, quiero información sobre la Licenciatura en {programa}." }),
          "{programa} se cambia por el nombre de cada licenciatura. El número va en la sección 02."));
      } else if (type === "page") {
        g.appendChild(field("Texto en la página principal", input(l.homeLabel, function (v) { l.homeLabel = v; }, { placeholder: "Conoce las licenciaturas" }),
          "Abre la página oficial de cada licenciatura; en la principal, la página de la Facultad (sección 02)."));
      } else {
        g.appendChild(field("Destino", el("p", "ed-note", "El pensum de cada licenciatura (se define en la sección 02).")));
      }
      body.appendChild(g);
      var sel = el("select", "ed-type");
      [["url", "Enlace fijo"], ["pensum", "Pensum de la licenciatura"], ["page", "Página de la licenciatura"], ["whatsapp", "WhatsApp con mensaje"]].forEach(function (o) {
        var op = el("option", null, o[1]); op.value = o[0]; sel.appendChild(op);
      });
      sel.value = type;
      sel.addEventListener("change", function () {
        l.type = sel.value === "url" ? undefined : sel.value;
        if (sel.value === "whatsapp" && !l.message) l.message = "Hola, quiero recibir asesoría sobre la Licenciatura en {programa}.";
        changed(true);
      });
      var tf = el("label", "ed-typefield"); tf.appendChild(el("span", null, "Tipo")); tf.appendChild(sel);
      var foot = el("div", "ed-foot");
      foot.appendChild(idChip(l, draft.links, "botón"));
      foot.appendChild(tf);
      if (type !== "whatsapp") {
        var emb = el("label", "check");
        emb.appendChild(input(l.embed, function (v) { l.embed = v || undefined; }, { type: "checkbox" }));
        emb.appendChild(document.createTextNode(" Abrir dentro de la página"));
        emb.title = "Funciona con páginas que permiten mostrarse incrustadas (como el pensum en Genially). Otras se abrirán en blanco.";
        foot.appendChild(emb);
      }
      var vis = el("label", "check");
      vis.appendChild(input(!l.hidden, function (v) { l.hidden = !v; row.classList.toggle("is-hidden", !v); }, { type: "checkbox" }));
      vis.appendChild(document.createTextNode(" Visible en la página"));
      foot.appendChild(vis);
      var del = el("button", "btn ghost small danger", "Eliminar"); del.type = "button";
      del.addEventListener("click", function () { removeLink(l, i); });
      foot.appendChild(del);
      body.appendChild(foot);
      row.appendChild(body);
      box.appendChild(row);
    });
  }

  function removeLink(l, i) {
    if (isLocked(l) && !l.hidden) {
      l.hidden = true;
      toast("«" + (l.label || l.id) + "» quedó oculto en vez de borrarse, para no romper QR que apunten directo a él. Si de verdad quieres borrarlo, pulsa Eliminar otra vez.", "warn");
      changed(true); return;
    }
    if (isLocked(l) && !confirm("¿Eliminar «" + (l.label || l.id) + "» definitivamente?\n\nUn QR directo a él (?to=" + l.id + ") abrirá la página completa en lugar del destino.")) return;
    draft.links.splice(i, 1);
    changed(true);
  }

  // ---------------- licenciaturas (nodos) ----------------
  function renderWhatsapp() {
    var box = $("#edWhatsapp"); box.textContent = "";
    var w = input(draft.whatsapp, function (v, n) {
      draft.whatsapp = v.replace(/[^\d]/g, "");
      n.classList.toggle("is-invalid", !!v && draft.whatsapp.length < 10);
    }, { placeholder: "573103018445", type: "tel" });
    box.appendChild(field("Número de WhatsApp de asesoría", w, "Con indicativo de país y sin + ni espacios. Ej.: 57 310 301 8445 → 573103018445"));
    var fp = input(draft.facultyPage, function (v, n) { draft.facultyPage = v.trim(); n.classList.toggle("is-invalid", !!v && !URL_RE.test(v.trim())); }, { type: "url", placeholder: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado" });
    box.appendChild(field("Página de la Facultad (para la página principal)", fp, "La abre el botón de tipo «Página de la licenciatura» cuando no hay licenciatura elegida."));
  }

  function renderPrograms() {
    var box = $("#edPrograms"); box.textContent = "";
    draft.programs.forEach(function (p, i) {
      var row = el("div", "ed-item prog");
      row.style.setProperty("--pc", p.color || "#2347c5");
      row.appendChild(moveBtns(draft.programs, i));
      var body = el("div", "ed-body");
      var head = el("div", "ed-prog-head");
      var color = input(p.color || "#2347c5", function (v) { p.color = v; row.style.setProperty("--pc", v); }, { type: "color", cls: "ed-color" });
      color.title = "Color de la licenciatura";
      head.appendChild(color);
      var nm = el("label", "field grow"); nm.appendChild(el("span", null, "Licenciatura en…"));
      nm.appendChild(input(p.name, function (v) {
        p.name = v;
        if (!isLocked(p) && !p.__idTouched) { p.id = uniqueId(slug(v), draft.programs, p); var idi = row.querySelector(".ed-id-input"); if (idi) idi.value = p.id; }
        fillPreviewSelect();
      }, { placeholder: "Artes" }));
      head.appendChild(nm);
      body.appendChild(head);
      body.appendChild(field("Texto bajo el título", input(p.tagline, function (v) { p.tagline = v; }, { textarea: true, placeholder: "Crea, enseña y transforma…" }),
        "Vacío = usa el subtítulo general."));
      var g = el("div", "ed-grid progs");
      g.appendChild(field("SNIES", input(p.snies, function (v) { p.snies = v.trim(); }, { placeholder: "105047" })));
      g.appendChild(field("Semestres", input(p.semesters, function (v) { p.semesters = v.trim(); }, { placeholder: "8" })));
      g.appendChild(field("Créditos", input(p.credits, function (v) { p.credits = v.trim(); }, { placeholder: "123" })));
      body.appendChild(g);
      var pen = input(p.pensum, function (v, n) { p.pensum = v.trim(); n.classList.toggle("is-invalid", !!v && !URL_RE.test(v.trim())); }, { type: "url", placeholder: "https://…" });
      pen.classList.toggle("is-invalid", !!p.pensum && !URL_RE.test(p.pensum));
      body.appendChild(field("Enlace al pensum", pen));
      var pg = input(p.page, function (v, n) { p.page = v.trim(); n.classList.toggle("is-invalid", !!v && !URL_RE.test(v.trim())); }, { type: "url", placeholder: "https://educacion.uniandes.edu.co/…" });
      pg.classList.toggle("is-invalid", !!p.page && !URL_RE.test(p.page));
      body.appendChild(field("Página oficial de la licenciatura", pg));
      body.appendChild(field("Mensaje de WhatsApp propio (opcional)", input(p.whatsappMessage, function (v) { p.whatsappMessage = v; }, {
        placeholder: window.QRNodes ? QRNodes.fill(generalWaMessage(), p) : "" }), "Vacío = usa el mensaje general del botón de WhatsApp."));
      var foot = el("div", "ed-foot");
      foot.appendChild(idChip(p, draft.programs, "licenciatura"));
      var see = el("button", "linkbtn", "Ver en la vista previa"); see.type = "button";
      see.addEventListener("click", function () { $("#edPreviewLic").value = p.id; pushPreview(); });
      foot.appendChild(see);
      var del = el("button", "btn ghost small danger", "Eliminar"); del.type = "button";
      del.addEventListener("click", function () {
        if (isLocked(p) && !confirm("¿Eliminar la Licenciatura en " + (p.name || p.id) + "?\n\nLos QR impresos con ?lic=" + p.id + " mostrarán el selector de licenciaturas en lugar de su página.")) return;
        draft.programs.splice(i, 1); changed(true);
      });
      foot.appendChild(del);
      body.appendChild(foot);
      row.appendChild(body);
      box.appendChild(row);
    });
    fillPreviewSelect();
  }
  function generalWaMessage() {
    var l = (draft.links || []).filter(function (x) { return x.type === "whatsapp"; })[0];
    return l && l.message ? l.message : "Hola, quiero recibir asesoría sobre la Licenciatura en {programa}.";
  }
  function fillPreviewSelect() {
    var sel = $("#edPreviewLic"), prev = sel.options.length ? sel.value : null;   // la primera vez: primera licenciatura
    sel.textContent = "";
    draft.programs.forEach(function (p) { var o = el("option", null, "Licenciatura en " + (p.name || p.id)); o.value = p.id; sel.appendChild(o); });
    var o = el("option", null, "Selector de licenciaturas (QR sin ?lic)"); o.value = ""; sel.appendChild(o);
    sel.value = prev !== null && Array.prototype.some.call(sel.options, function (x) { return x.value === prev; }) ? prev : (draft.programs[0] ? draft.programs[0].id : "");
  }
  function addProgram() {
    var p = { id: uniqueId("licenciatura", draft.programs), name: "", color: "#2347c5" };
    draft.programs.push(p); changed(true);
    var rows = document.querySelectorAll("#edPrograms .ed-item"); var last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); last.querySelector(".field.grow input").focus(); }
  }

  var PH = ["#e9a63a", "#f4c3cb", "#4cc27f", "#a9bbf7"];
  function renderSources() {
    var box = $("#edSources"); box.textContent = "";
    draft.sources.forEach(function (s, i) {
      var row = el("div", "ed-item src");
      row.appendChild(moveBtns(draft.sources, i));
      var media = el("div", "ed-media");
      var th = el("div", "ed-thumb");
      var src = pending[s.image] ? pending[s.image].dataUrl : s.image;
      if (src) { var im = el("img"); im.src = src; im.alt = ""; th.appendChild(im); }
      else { th.style.background = PH[i % PH.length]; th.appendChild(el("span", null, s.type || "Sin imagen")); }
      media.appendChild(th);
      media.appendChild(fileButton(src ? "Cambiar imagen" : "Subir imagen", function (img) {
        if (s.image && pending[s.image]) delete pending[s.image];
        s.image = "previews/" + (slug(s.id) || "origen") + "." + img.ext;
        pending[s.image] = img;
        changed(true);
      }));
      if (src) {
        var q = el("button", "linkbtn", "Quitar imagen"); q.type = "button";
        q.addEventListener("click", function () { delete pending[s.image]; s.image = ""; changed(true); });
        media.appendChild(q);
      }
      row.appendChild(media);

      var body = el("div", "ed-body");
      var g = el("div", "ed-grid sources");
      g.appendChild(field("Nombre", input(s.label, function (v) {
        s.label = v;
        if (!isLocked(s) && !s.__idTouched) { s.id = uniqueId(slug(v), draft.sources, s); var idi = row.querySelector(".ed-id-input"); if (idi) idi.value = s.id; }
      })));
      g.appendChild(field("Tipo de pieza", input(s.type, function (v) { s.type = v; }, { list: "edTypes", placeholder: "Afiche, Volante…" })));
      g.appendChild(field("Ubicación", input(s.place, function (v) { s.place = v; }, { placeholder: "Dónde está" })));
      body.appendChild(g);
      var foot = el("div", "ed-foot");
      foot.appendChild(idChip(s, draft.sources, "origen"));
      var del = el("button", "btn ghost small danger", "Eliminar"); del.type = "button";
      del.addEventListener("click", function () {
        if (isLocked(s) && !confirm("¿Eliminar el origen «" + (s.label || s.id) + "»?\n\nLos QR impresos con ?src=" + s.id + " seguirán funcionando, pero el panel lo mostrará solo con su id.")) return;
        if (s.image && pending[s.image]) delete pending[s.image];
        draft.sources.splice(i, 1); changed(true);
      });
      foot.appendChild(del);
      body.appendChild(foot);
      row.appendChild(body);
      box.appendChild(row);
    });
  }

  // imagen → redimensionada (máx. 1400 px) y comprimida a WebP (o JPEG si el navegador no soporta WebP)
  function fileButton(label, onImage) {
    var b = el("label", "btn ghost small file-btn", label);
    var f = el("input"); f.type = "file"; f.accept = "image/*";
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; f.value = "";
      if (!file) return;
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL("image/webp", 0.85), ext = "webp";
        if (dataUrl.indexOf("data:image/webp") !== 0) { dataUrl = c.toDataURL("image/jpeg", 0.85); ext = "jpg"; }
        onImage({ dataUrl: dataUrl, b64: dataUrl.split(",")[1], ext: ext });
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast("No se pudo leer esa imagen.", "bad"); };
      img.src = url;
    });
    b.appendChild(f);
    return b;
  }

  function renderData() {
    var box = $("#edData"); box.textContent = "";
    box.appendChild(field("URL del Web App de Apps Script (endpoint)", input(draft.endpoint, function (v) { draft.endpoint = v.trim(); }, { type: "url", placeholder: "https://script.google.com/macros/s/…/exec" }),
      "Vacío = las visitas solo se guardan en el navegador (modo prueba)."));
    var geo = el("label", "check");
    geo.appendChild(input(draft.geo, function (v) { draft.geo = v; }, { type: "checkbox" }));
    geo.appendChild(document.createTextNode(" Registrar país y ciudad aproximados (ipapi.co, sin guardar la IP)"));
    box.appendChild(geo);
  }

  // ---------------- publicación en GitHub ----------------
  function ghDefaults() {
    var saved = {};
    try { saved = JSON.parse((LS && LS.getItem("qrhub_gh")) || "{}"); } catch (e) {}
    var d = { owner: "", repo: "", branch: "main", folder: "", token: "" };
    var m = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
    if (m) {
      d.owner = m[1];
      var parts = location.pathname.split("/").filter(Boolean);
      if (parts.length && /\.html?$/.test(parts[parts.length - 1])) parts.pop();
      d.repo = parts.shift() || (m[1] + ".github.io");
      d.folder = parts.join("/");
    }
    return Object.assign(d, saved);
  }
  var gh;
  function renderGitHub() {
    gh = ghDefaults();
    var box = $("#edGitHub"); box.textContent = "";
    var g = el("div", "ed-grid gh");
    [["owner", "Usuario u organización"], ["repo", "Repositorio"], ["branch", "Rama"], ["folder", "Carpeta dentro del repo (vacío = raíz)"]].forEach(function (p) {
      g.appendChild(field(p[1], input(gh[p[0]], function (v) { gh[p[0]] = v.trim(); saveGh(); updateSaveLabel(); })));
    });
    box.appendChild(g);
    box.appendChild(field("Token de GitHub", input(gh.token, function (v) { gh.token = v.trim(); saveGh(); updateSaveLabel(); }, { type: "password", placeholder: "github_pat_…" }),
      "Crea un «fine-grained token» en GitHub ▸ Settings ▸ Developer settings, solo para este repositorio, con permiso Contents: Read and write."));
    var rem = el("label", "check");
    rem.appendChild(input(!!(LS && LS.getItem("qrhub_gh_remember")), function (v) {
      if (!LS) return;
      if (v) LS.setItem("qrhub_gh_remember", "1"); else { LS.removeItem("qrhub_gh_remember"); LS.removeItem("qrhub_gh"); }
      saveGh();
    }, { type: "checkbox" }));
    rem.appendChild(document.createTextNode(" Recordar en este navegador (no lo actives en equipos compartidos)"));
    box.appendChild(rem);
  }
  function saveGh() {
    if (LS && LS.getItem("qrhub_gh_remember")) LS.setItem("qrhub_gh", JSON.stringify(gh));
  }
  function ghReady() { return gh && gh.owner && gh.repo && gh.token; }

  // ================================================================
  //   ESTADO, VALIDACIÓN Y VISTA PREVIA
  // ================================================================
  var localSave = null;   // null = aún no se sabe
  function detectLocal() {
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { localSave = false; updateSaveLabel(); return; }
    fetch("__ping", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { localSave = !!j.canSave; updateSaveLabel(); })
      .catch(function () { localSave = false; updateSaveLabel(); });
  }
  function saveMode() { return localSave ? "local" : ghReady() ? "github" : "download"; }
  function updateSaveLabel() {
    var m = saveMode(), b = $("#edSave");
    b.textContent = m === "local" ? "Guardar en este computador" : m === "github" ? "Publicar en GitHub" : "Descargar config.js";
    $("#edDownload").hidden = m === "download";
    $("#edMode").textContent = m === "local" ? "Los cambios se guardan en la carpeta del proyecto (con copia de respaldo en backups/)."
      : m === "github" ? "Los cambios se publican en " + gh.owner + "/" + gh.repo + " y el sitio se actualiza en ~1 minuto."
      : "Sin conexión para guardar: se descargará config.js para que lo subas a GitHub (o completa la sección 06).";
  }

  function isDirty() { return generate(draft) !== generate(baseline) || Object.keys(pending).length > 0; }

  var tPrev;
  function changed(rerender) {
    if (rerender) renderLists();
    var dirty = isDirty();
    $("#edStatus").textContent = dirty ? "Cambios sin guardar" : "Sin cambios";
    $("#edBar").classList.toggle("is-dirty", dirty);
    renderChecks();
    clearTimeout(tPrev); tPrev = setTimeout(pushPreview, 120);
  }
  function renderLists() { renderPrograms(); renderLinks(); renderSources(); }

  function checks() {
    var res = window.QRPanel ? window.QRPanel.checkConfig(draft) : [];
    // ids bloqueados que desaparecieron (ni como id ni como alias)
    var now = lockedIds(draft);
    var lost = Object.keys(locked).filter(function (k) { return !now[k]; });
    if (lost.length) res.unshift(["warn", "Ids que ya no existen: " + lost.join(", "), "Si alguno está impreso, ese QR mostrará la página completa (si era un botón) o se contará sin nombre (si era un origen)."]);
    all(draft).forEach(function (it) { if (!it.id) res.unshift(["bad", "Hay un elemento sin id", "Escribe un nombre para generarlo."]); });
    return res;
  }
  function renderChecks() {
    var res = checks(), ul = $("#edHealth"); ul.textContent = "";
    var ICON = { good: "✓", warn: "!", bad: "✕" };
    res.forEach(function (r) {
      var li = el("li", r[0]); li.appendChild(el("span", "ic", ICON[r[0]]));
      var d = el("div"); d.appendChild(el("b", null, r[1])); d.appendChild(el("small", null, r[2])); li.appendChild(d);
      ul.appendChild(li);
    });
    $("#edSave").disabled = res.some(function (r) { return r[0] === "bad"; });
  }

  function previewConfig() {
    var c = clone(draft);
    if (pending[c.avatar]) c.avatar = pending[c.avatar].dataUrl;
    return c;
  }
  function pushPreview() {
    var f = $("#edPreview");
    if (!draft) return;   // el editor aún no se ha abierto; la vista previa usa config.js tal cual
    if (previewReady && f.contentWindow) f.contentWindow.postMessage({ type: "qrhub-config", config: previewConfig(), lic: $("#edPreviewLic").value }, location.origin);
  }
  window.addEventListener("message", function (e) {
    if (e.origin === location.origin && e.data && e.data.type === "qrhub-preview-ready") { previewReady = true; pushPreview(); }
  });

  var tToast;
  function toast(msg, kind) {
    var t = $("#edToast");
    t.textContent = msg; t.className = "ed-toast " + (kind || "good"); t.hidden = false;
    clearTimeout(tToast); tToast = setTimeout(function () { t.hidden = true; }, 7000);
  }

  // ================================================================
  //   GUARDAR
  // ================================================================
  function b64utf8(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function filesToSave() {
    var files = [];
    // solo imágenes que siguen en uso
    var used = {}; used[draft.avatar] = 1; draft.sources.forEach(function (s) { used[s.image] = 1; });
    Object.keys(pending).forEach(function (p) { if (used[p]) files.push({ path: p, b64: pending[p].b64 }); });
    files.push({ path: "config.js", b64: b64utf8(generate(draft)) });   // config al final: las imágenes ya existen
    return files;
  }

  function afterSave(msg) {
    var cfg = window.HUB_CONFIG = window.HUB_CONFIG || {};
    var fresh = clone(draft);
    all(fresh).forEach(function (it) { delete it.__wasSaved; delete it.__idTouched; });
    Object.keys(cfg).forEach(function (k) { delete cfg[k]; });
    Object.assign(cfg, fresh);   // el resto del panel usa el mismo objeto
    markSaved(draft);
    all(draft).forEach(function (it) { delete it.__idTouched; });
    baseline = clone(draft);
    locked = lockedIds(draft);
    pending = {};
    renderAll();
    if (window.QRPanel && window.QRPanel.refreshHealth) window.QRPanel.refreshHealth();
    toast(msg, "good");
  }

  function saveLocal(files) {
    return fetch("__save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: files }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || "error");
        afterSave("Guardado ✓ La página pública ya muestra los cambios. Copia anterior en " + j.backup + ".");
      });
  }

  function ghFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ "Authorization": "Bearer " + gh.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, opts.headers || {});
    return fetch("https://api.github.com/repos/" + encodeURIComponent(gh.owner) + "/" + encodeURIComponent(gh.repo) + "/contents/" + path, opts);
  }
  function saveGitHub(files) {
    var base = gh.folder ? gh.folder.replace(/^\/+|\/+$/g, "") + "/" : "";
    var branch = gh.branch || "main";
    var chain = Promise.resolve();
    files.forEach(function (f) {
      var path = (base + f.path).split("/").map(encodeURIComponent).join("/");
      chain = chain.then(function () {
        return ghFetch(path + "?ref=" + encodeURIComponent(branch), { cache: "no-store" }).then(function (r) {
          if (r.status === 404) return null;
          if (r.status === 401) throw new Error("token inválido o vencido");
          if (!r.ok) throw new Error("GitHub respondió " + r.status + " al leer " + f.path);
          return r.json();
        }).then(function (cur) {
          var body = { message: "Actualiza " + f.path + " desde el panel QR", content: f.b64, branch: branch };
          if (cur && cur.sha) body.sha = cur.sha;
          return ghFetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }).then(function (r) {
          if (r.status === 403 || r.status === 404) throw new Error("el token no tiene permiso de escritura en " + gh.owner + "/" + gh.repo);
          if (r.status === 409) throw new Error("conflicto: alguien cambió " + f.path + " al mismo tiempo; vuelve a intentarlo");
          if (!r.ok) throw new Error("GitHub respondió " + r.status + " al guardar " + f.path);
        });
      });
    });
    return chain.then(function () { afterSave("Publicado en GitHub ✓ El sitio se actualiza en 1–2 minutos."); });
  }

  function download(name, href) {
    var a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function saveDownload() {
    var url = URL.createObjectURL(new Blob([generate(draft)], { type: "text/javascript;charset=utf-8" }));
    download("config.js", url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    var imgs = filesToSave().filter(function (f) { return f.path !== "config.js"; });
    imgs.forEach(function (f, i) { setTimeout(function () { download(f.path.split("/").pop(), pending[f.path].dataUrl); }, 300 * (i + 1)); });
    toast("Descargado config.js" + (imgs.length ? " y " + imgs.length + " imagen(es) (súbelas a la carpeta previews/)" : "") + ". Reemplázalo en tu repositorio de GitHub.", "good");
  }

  function save() {
    if (checks().some(function (r) { return r[0] === "bad"; })) { toast("Corrige los errores marcados con ✕ antes de guardar.", "bad"); return; }
    var mode = saveMode();
    if (mode === "download") { saveDownload(); return; }
    var btn = $("#edSave"); btn.disabled = true; var old = btn.textContent; btn.textContent = "Guardando…";
    (mode === "local" ? saveLocal(filesToSave()) : saveGitHub(filesToSave()))
      .catch(function (err) { toast("No se pudo guardar: " + err.message, "bad"); })
      .then(function () { btn.textContent = old; renderChecks(); });
  }

  // ================================================================
  function renderAll() {
    renderGeneral(); renderWhatsapp(); renderLists(); renderData(); renderGitHub();
    changed(false);
    updateSaveLabel();
  }

  function addLink() {
    var l = { id: uniqueId("enlace", draft.links), label: "", url: "", icon: "" };
    draft.links.push(l); changed(true);
    var rows = document.querySelectorAll("#edLinks .ed-item"); var last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); last.querySelectorAll("input")[1].focus(); }
  }
  function addSource() {
    var s = { id: uniqueId("origen", draft.sources), label: "", type: "", place: "" };
    draft.sources.push(s); changed(true);
    var rows = document.querySelectorAll("#edSources .ed-item"); var last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); last.querySelector(".ed-body input").focus(); }
  }

  window.QREditor = {
    open: function () {
      if (built) return;
      built = true;
      load();
      markSaved(draft);
      baseline = clone(draft);
      $("#edAddLink").addEventListener("click", addLink);
      $("#edAddSource").addEventListener("click", addSource);
      $("#edAddProgram").addEventListener("click", addProgram);
      $("#edPreviewLic").addEventListener("change", pushPreview);
      $("#edSave").addEventListener("click", save);
      $("#edDownload").addEventListener("click", saveDownload);
      $("#edReset").addEventListener("click", function () {
        if (isDirty() && !confirm("¿Descartar todos los cambios sin guardar?")) return;
        draft = clone(baseline); pending = {}; renderAll();
      });
      window.addEventListener("beforeunload", function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });
      detectLocal();
      renderAll();
    },
    isDirty: function () { return built && isDirty(); }
  };
})();
