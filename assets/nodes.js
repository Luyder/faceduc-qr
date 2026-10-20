/* ============================================================
   Nodos por licenciatura: lógica compartida por la página pública,
   el rastreador, el panel y el editor.
   - ?lic=ID elige la licenciatura (id fijo, admite alias).
   - Un enlace puede ser:
       type "url"       → usa su url tal cual
       type "pensum"    → usa el pensum de la licenciatura
       type "whatsapp"  → abre WhatsApp con un mensaje según la licenciatura
       type "page"      → página oficial de la licenciatura (en la principal, cfg.facultyPage)
   - embed: true → se abre dentro de la página (p. ej. el pensum) en vez de salir
   ============================================================ */
(function () {
  "use strict";

  function norm(v) { return String(v || "").trim().toLowerCase(); }

  function resolve(list, id) {
    var n = norm(id);
    if (!n) return null;
    for (var i = 0; i < (list || []).length; i++) {
      var it = list[i];
      if (!it) continue;
      if (norm(it.id) === n) return it;
      var al = it.aliases || [];
      for (var j = 0; j < al.length; j++) if (norm(al[j]) === n) return it;
    }
    return null;
  }

  function fill(tpl, program) {
    return String(tpl || "")
      .replace(/\{programa\}/g, program ? program.name : "")
      .replace(/\{licenciatura\}/g, program ? "Licenciatura en " + program.name : "");
  }

  function digits(v) { return String(v || "").replace(/\D+/g, ""); }

  // url final de un enlace para una licenciatura ("" si no aplica)
  function linkUrl(cfg, link, program) {
    if (!link) return "";
    var type = link.type || "url";
    if (type === "pensum") return program && program.pensum ? program.pensum : "";
    if (type === "page") return program ? (program.page || "") : (cfg.facultyPage || "");
    if (type === "whatsapp") {
      var phone = digits(link.phone || cfg.whatsapp);
      if (!phone) return "";
      var msg = (program && program.whatsappMessage) || link.message || "";
      msg = fill(msg, program);
      return "https://wa.me/" + phone + (msg ? "?text=" + encodeURIComponent(msg) : "");
    }
    return fill(link.url, program);
  }

  // enlaces visibles ya resueltos para una licenciatura
  function linksFor(cfg, program, includeHidden) {
    return (cfg.links || []).filter(function (l) { return l && (includeHidden || !l.hidden); })
      .map(function (l) {
        var copy = {};
        for (var k in l) copy[k] = l[k];
        copy.url = linkUrl(cfg, l, program);
        if (!program && l.homeLabel) copy.label = l.homeLabel;   // texto distinto en la página principal
        return copy;
      })
      .filter(function (l) { return /^(https?:|mailto:|tel:)|^(?!\/)[\w.\/-]+\.html?(\?[^\s#]*)?(#[\w-]*)?$/i.test(l.url); });
  }

  // ---------- color: versión legible sobre papel crema ----------
  function hexToRgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lum(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toHex(rgb) { return "#" + rgb.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }
  // oscurece el color hasta alcanzar el contraste pedido contra el papel (#f7f4ec)
  function ink(hex, min) {
    var rgb = hexToRgb(hex), paper = [247, 244, 236];
    if (!rgb) return "#141414";
    min = min || 3;
    for (var k = 0; k < 20 && contrast(rgb, paper) < min; k++) rgb = rgb.map(function (v) { return v * 0.88; });
    return toHex(rgb);
  }

  window.QRNodes = {
    norm: norm, resolve: resolve, fill: fill, linkUrl: linkUrl, linksFor: linksFor, ink: ink,
    program: function (cfg, id) { return resolve((cfg || {}).programs, id); }
  };
})();
