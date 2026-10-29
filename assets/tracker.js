/* ============================================================
   Rastreador de entradas y salidas (sin cookies de terceros)
   Envía eventos al Web App de Apps Script o, si no hay endpoint,
   los guarda en localStorage para pruebas.
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.HUB_CONFIG || {};
  var LOCAL_KEY = "qrhub_events";
  var LOCAL_MAX = 5000;

  // ---------- utilidades seguras de almacenamiento ----------
  function store(kind) {
    try { var s = window[kind]; var k = "__t"; s.setItem(k, "1"); s.removeItem(k); return s; }
    catch (e) { return null; }
  }
  var LS = store("localStorage");
  var SS = store("sessionStorage");

  function rid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 16);
  }

  // ---------- identidad anónima ----------
  var newVisitor = false;
  var vid = LS && LS.getItem("qrhub_vid");
  if (!vid) { vid = rid(); newVisitor = true; if (LS) LS.setItem("qrhub_vid", vid); }


  // ---------- ids fijos + alias ----------
  // Un QR impreso solo contiene ids. Se buscan por id o por cualquiera de sus "aliases",
  // sin distinguir mayúsculas, para que renombrar o reordenar no rompa nada.
  function norm(v) { return String(v || "").trim().toLowerCase(); }
  function resolve(list, id) {
    id = norm(id);
    if (!id) return null;
    for (var i = 0; i < (list || []).length; i++) {
      var it = list[i];
      if (norm(it.id) === id) return it;
      var al = it.aliases || [];
      for (var j = 0; j < al.length; j++) if (norm(al[j]) === id) return it;
    }
    return null;
  }

  // ---------- parámetros de entrada ----------
  var qs = new URLSearchParams(location.search);
  var rawSrc = norm(qs.get("src") || qs.get("qr") || qs.get("utm_source")).slice(0, 80);
  var knownSrc = resolve(CFG.sources, rawSrc);
  var src = knownSrc ? knownSrc.id : rawSrc;

  // ---------- sesión (visita) compartida por todas las pestañas del dispositivo ----------
  // Antes era por pestaña: si el navegador recargaba una pestaña vieja del sitio contaba como otra visita.
  // Termina tras 30 min sin actividad o cuando se escanea un QR distinto.
  var SESSION_MS = 30 * 60 * 1000, SKEY = "qrhub_sess", ST = LS || SS;
  function readSess() { try { return JSON.parse((ST && ST.getItem(SKEY)) || "null"); } catch (e) { return null; } }
  function touchSess(s, force) {
    s.t = Date.now();
    var cur = readSess();
    if (!force && cur && cur.id !== s.id && Date.now() - cur.t < SESSION_MS) return;   // otra pestaña ya empezó una visita nueva
    try { if (ST) ST.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
  }
  var sess = readSess();
  if (!sess || Date.now() - sess.t > SESSION_MS || (src && src !== (sess.src || ""))) sess = { id: rid(), src: src };
  if (src) sess.src = src;
  touchSess(sess, true);
  var sid = sess.id;
  // el origen del QR se recuerda durante toda la visita (pensum, salidas de campo…)
  if (!src) src = sess.src || "";
  if (!src) src = document.referrer ? "referido" : "directo";
  var target = qs.get("to") || qs.get("go") || "";
  // licenciatura (nodo): ?lic=ID, también por alias
  var rawNode = norm(qs.get("lic") || qs.get("n") || window.QRHUB_NODE).slice(0, 60);
  var program = window.QRNodes ? QRNodes.program(CFG, rawNode) : null;
  var node = program ? program.id : rawNode;

  // ---------- entorno del dispositivo ----------
  function env() {
    var ua = navigator.userAgent || "";
    var touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    var device = /iPad|Tablet/i.test(ua) || touchMac || (/Android/i.test(ua) && !/Mobile/i.test(ua))
      ? "Tablet" : /Mobi|iPhone|iPod|Android/i.test(ua) ? "Móvil" : "Escritorio";

    var os = /iPhone|iPad|iPod/.test(ua) || touchMac ? "iOS" :
             /Android/.test(ua) ? "Android" :
             /Windows/.test(ua) ? "Windows" :
             /CrOS/.test(ua) ? "ChromeOS" :
             /Mac OS X|Macintosh/.test(ua) ? "macOS" :
             /Linux/.test(ua) ? "Linux" : "Otro";

    var browser = /Instagram/.test(ua) ? "Instagram (app)" :
                  /FBAN|FBAV/.test(ua) ? "Facebook (app)" :
                  /TikTok|musical_ly/i.test(ua) ? "TikTok (app)" :
                  /Line\//.test(ua) ? "LINE (app)" :
                  /EdgA?\//.test(ua) ? "Edge" :
                  /OPR\/|Opera/.test(ua) ? "Opera" :
                  /SamsungBrowser/.test(ua) ? "Samsung Internet" :
                  /Firefox|FxiOS/.test(ua) ? "Firefox" :
                  /CriOS|Chrome/.test(ua) ? "Chrome" :
                  /Safari/.test(ua) ? "Safari" : "Otro";

    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}

    return {
      device: device, os: os, browser: browser,
      lang: (navigator.language || "").slice(0, 12),
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || "").slice(0, 40),
      screen: screen.width + "x" + screen.height,
      ref: ref
    };
  }
  var ENV = env();

  // ---------- ubicación aproximada opcional ----------
  var geo = { country: "", city: "" };
  var geoReady = Promise.resolve();
  if (CFG.geo) {
    var cached = SS && SS.getItem("qrhub_geo");
    if (cached) { try { geo = JSON.parse(cached); } catch (e) {} }
    else {
      geoReady = Promise.race([
        fetch("https://ipapi.co/json/").then(function (r) { return r.json(); }).then(function (j) {
          geo = { country: j.country_name || "", city: j.city || "" };
          if (SS) SS.setItem("qrhub_geo", JSON.stringify(geo));
        }).catch(function () {}),
        new Promise(function (res) { setTimeout(res, 1500); })
      ]);
    }
  }

  // ---------- envío ----------
  function base(type) {
    var p = new URLSearchParams(location.search);
    return {
      type: type,
      ts: new Date().toISOString(),
      vid: vid, sid: sid, src: src,
      utm_medium: (p.get("utm_medium") || "").slice(0, 60),
      utm_campaign: (p.get("utm_campaign") || "").slice(0, 60),
      new_visitor: newVisitor ? 1 : 0,
      device: ENV.device, os: ENV.os, browser: ENV.browser,
      lang: ENV.lang, tz: ENV.tz, screen: ENV.screen, ref: ENV.ref,
      country: geo.country, city: geo.city,
      node: node,
      page: location.pathname.split("/").pop() || "index.html"
    };
  }

  function send(evt) {
    if (window.QRHUB_PREVIEW) return;   // vista previa del editor: no se registra nada
    var cur = readSess();
    if (cur && cur.id === sess.id) sess.t = Math.max(sess.t, cur.t);   // otra pestaña pudo mantener viva la visita
    var renew = Date.now() - sess.t > SESSION_MS;
    if (renew) { sess = { id: rid(), src: sess.src }; sid = evt.sid = sess.id; }   // pestaña inactiva más de 30 min
    touchSess(sess, renew);
    if (!CFG.endpoint) {
      if (!LS) return;
      try {
        var arr = JSON.parse(LS.getItem(LOCAL_KEY) || "[]");
        arr.push(evt);
        if (arr.length > LOCAL_MAX) arr = arr.slice(-LOCAL_MAX);
        LS.setItem(LOCAL_KEY, JSON.stringify(arr));
      } catch (e) {}
      return;
    }
    var body = JSON.stringify(evt);
    // text/plain = petición "simple": no dispara CORS preflight con Apps Script
    var ok = false;
    try { ok = navigator.sendBeacon && navigator.sendBeacon(CFG.endpoint, new Blob([body], { type: "text/plain;charset=utf-8" })); } catch (e) {}
    if (!ok) {
      try { fetch(CFG.endpoint, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body }); } catch (e) {}
    }
  }

  // ---------- métricas de permanencia ----------
  var t0 = performance.now();
  var visibleMs = 0, visibleSince = document.visibilityState === "visible" ? t0 : null;
  var clicks = 0, firstClickMs = null, lastLink = "";

  function dwell() {
    var extra = visibleSince != null ? performance.now() - visibleSince : 0;
    return Math.round(visibleMs + extra);
  }

  // enlace con su url final para la licenciatura actual (pensum y WhatsApp cambian según ?lic)
  function findLink(id) {
    var l = resolve(CFG.links, id);
    if (!l || !window.QRNodes) return l;
    var copy = {}; for (var k in l) copy[k] = l[k];
    copy.url = QRNodes.linkUrl(CFG, l, program);
    return copy;
  }

  // acción dentro del sitio: abrir/cerrar el visor, ver un curso, volver de otra pestaña…
  function track(action, detail) {
    var e = base("action");
    e.action = String(action || "").slice(0, 40);
    e.detail = String(detail == null ? "" : detail).slice(0, 120);
    send(e);
  }

  function trackClick(link) {
    clicks++;
    var ms = Math.round(performance.now() - t0);
    if (firstClickMs == null) firstClickMs = ms;
    lastLink = link.id;
    var e = base("click");
    e.link_id = link.id;
    e.link_url = link.url;
    e.t_to_click_ms = ms;
    e.clicks = clicks;
    send(e);
  }

  // kind: "oculta" = cambió de pestaña o de app (puede volver) · "cierra" = cerró la pestaña o salió de la página
  var exitSent = 0, lastExitAt = -1e9, closed = false;
  function trackExit(kind) {
    if (window.QRHUB_NO_EXIT || closed) return;   // pensum en el visor: la salida la mide la página principal
    if (kind === "cierra") closed = true;
    else if (performance.now() - lastExitAt < 1500) return;   // pagehide + visibilitychange llegan juntos
    lastExitAt = performance.now();
    var e = base("exit");
    e.detail = kind;
    e.dwell_ms = dwell();
    e.clicks = clicks;
    e.link_id = lastLink;               // vacío = abandono sin elegir enlace
    e.t_to_click_ms = firstClickMs == null ? "" : firstClickMs;
    exitSent++;
    send(e);
  }

  var hiddenAt = null;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (visibleSince != null) { visibleMs += performance.now() - visibleSince; visibleSince = null; }
      hiddenAt = performance.now();
      trackExit("oculta");
    } else {
      visibleSince = performance.now();
      // volvió al sitio después de abrir un enlace en otra pestaña (o de cambiar de app)
      if (hiddenAt != null && !window.QRHUB_NO_EXIT) {
        var away = Math.round((performance.now() - hiddenAt) / 1000);
        if (away >= 2) track("regresa", away + (lastLink ? "|" + lastLink : ""));
      }
      hiddenAt = null;
    }
  });
  window.addEventListener("pagehide", function () { trackExit("cierra"); });
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) closed = false; });   // volvió con «atrás» (caché del navegador)

  // ---------- API pública ----------
  window.QRHub = {
    trackClick: trackClick,
    track: track,
    findLink: findLink,
    program: program,
    // Registra la visita. Si hay ?to=ID válido, redirige directamente (modo acortador).
    start: function (onReady) {
      var direct = target ? findLink(target) : null;
      if (direct && !/^(https?:|mailto:|tel:)|^(?!\/)[\w.\/-]+\.html?(\?[^\s#]*)?(#[\w-]*)?$/i.test(direct.url || "")) direct = null;   // destino inválido → mostrar la página
      var wait = direct ? Promise.race([geoReady, new Promise(function (r) { setTimeout(r, 400); })]) : geoReady;
      if (direct && onReady) onReady(direct);
      wait.then(function () {
        var v = base("visit");
        v.link_id = direct ? direct.id : "";
        send(v);
        if (direct) {
          trackClick(direct);
          // los enlaces que se abren dentro de la página (pensum) no redirigen
          if (!direct.embed) setTimeout(function () { location.replace(direct.url); }, CFG.endpoint ? 50 : 0);
        }
      });
      return direct;
    }
  };
})();
