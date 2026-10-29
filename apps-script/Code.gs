/* ============================================================
   Backend gratuito: Google Apps Script + Google Sheets
   - doPost recibe eventos del nodo (visit / click / exit / action)
     action = lo que la persona hace dentro del sitio: abrir el pensum,
     ver un curso, abrir el recorrido 360, volver de otra pestaña…
   - doPost con {action:"read", key} devuelve los datos al panel
   La clave de lectura se guarda en Propiedades del script:
   Configuración del proyecto ▸ Propiedades del script ▸ ADMIN_KEY
   ============================================================ */

var SHEET_NAME = "eventos";
var COLUMNS = [
  "server_ts", "ts", "type", "vid", "sid", "src", "utm_medium", "utm_campaign",
  "link_id", "link_url", "t_to_click_ms", "dwell_ms", "clicks", "new_visitor",
  "device", "os", "browser", "lang", "tz", "screen", "ref", "country", "city", "page",
  "node",   // licenciatura (?lic=). Columnas nuevas siempre al final para no desordenar las anteriores
  "action", "detail"   // qué hizo dentro del sitio y sobre qué (curso, pestaña, segundos…)
];
var TYPES = { visit: 1, click: 1, exit: 1, action: 1 };

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < COLUMNS.length) {
    // hoja creada con una versión anterior: agrega los encabezados que falten
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  if (v === undefined || v === null) return "";
  var s = String(v).replace(/[\r\n\t]/g, " ");
  // evita que la hoja interprete el texto como fórmula
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max || 200);
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "json" }); }

  // ----- lectura para el panel -----
  if (body && body.action === "read") {
    var key = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
    if (!key || body.key !== key) return json_({ ok: false, error: "auth" });
    var values = sheet_().getDataRange().getValues();
    var head = values.shift();
    var since = body.since ? new Date(body.since).getTime() : 0;
    var rows = [];
    for (var i = 0; i < values.length; i++) {
      var r = {};
      for (var c = 0; c < head.length; c++) {
        var v = values[i][c];
        r[head[c]] = v instanceof Date ? v.toISOString() : v;
      }
      if (since && new Date(r.ts || r.server_ts).getTime() < since) continue;
      rows.push(r);
    }
    return json_({ ok: true, count: rows.length, events: rows });
  }

  // ----- ingesta de eventos -----
  var events = Array.isArray(body) ? body.slice(0, 20) : [body];
  var out = [];
  var now = new Date();
  events.forEach(function (ev) {
    if (!ev || !TYPES[ev.type]) return;
    out.push(COLUMNS.map(function (col) {
      if (col === "server_ts") return now;
      return clean_(ev[col], col === "link_url" ? 500 : 120);
    }));
  });
  if (!out.length) return json_({ ok: false, error: "empty" });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_();
    sh.getRange(sh.getLastRow() + 1, 1, out.length, COLUMNS.length).setValues(out);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, n: out.length });
}

function doGet() {
  return json_({ ok: true, service: "qr-hub", hint: "usa POST" });
}

/* Ejecuta esta función una vez desde el editor para crear la hoja y
   comprobar permisos. */
function setup() {
  sheet_();
  var key = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  Logger.log(key ? "ADMIN_KEY configurada ✔" : "Falta ADMIN_KEY en Propiedades del script");
}
