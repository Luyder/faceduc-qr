"""Servidor local para pruebas y edición.

- Igual que `python3 -m http.server`, pero sin caché (el navegador siempre ve la última versión).
- Permite que la pestaña «Configurar» del panel guarde config.js y las imágenes de previews/
  directamente en esta carpeta. Solo acepta guardados desde este mismo computador
  (no desde el celular u otros equipos de la red) y guarda una copia de respaldo en backups/.

Uso: python3 servir.py [puerto]
"""
import base64, datetime, functools, http.server, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
ALLOWED = re.compile(r"^(config\.js|previews/[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png))$")
MAX_BODY = 20 * 1024 * 1024


def js_ok(text):
    """Comprueba la sintaxis con Node si está instalado; si no, una revisión mínima."""
    if "window.HUB_CONFIG" not in text:
        return False, "config.js debe definir window.HUB_CONFIG"
    node = shutil.which("node")
    if not node:
        return True, ""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(text)
        tmp = f.name
    try:
        r = subprocess.run([node, "--check", tmp], capture_output=True, text=True, timeout=10)
        return r.returncode == 0, r.stderr.strip()[-400:]
    finally:
        os.unlink(tmp)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _local(self):
        return self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def do_GET(self):
        if self.path == "/__ping":
            return self._json(200, {"ok": True, "canSave": self._local()})
        return super().do_GET()

    def do_POST(self):
        if self.path != "/__save":
            return self._json(404, {"ok": False, "error": "ruta desconocida"})
        if not self._local():
            return self._json(403, {"ok": False, "error": "Solo se puede guardar desde este computador"})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self._json(413, {"ok": False, "error": "Tamaño no permitido"})
        try:
            files = json.loads(self.rfile.read(size))["files"]
        except Exception:
            return self._json(400, {"ok": False, "error": "JSON inválido"})

        # validar todo antes de escribir nada
        decoded = []
        for f in files:
            path = str(f.get("path", ""))
            if not ALLOWED.match(path):
                return self._json(400, {"ok": False, "error": f"Ruta no permitida: {path}"})
            data = base64.b64decode(f.get("b64", ""))
            if path == "config.js":
                ok, msg = js_ok(data.decode("utf-8"))
                if not ok:
                    return self._json(400, {"ok": False, "error": "config.js inválido: " + msg})
            decoded.append((path, data))

        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        written = []
        for path, data in decoded:
            dest = os.path.join(ROOT, path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if path == "config.js" and os.path.exists(dest):
                os.makedirs(os.path.join(ROOT, "backups"), exist_ok=True)
                shutil.copy2(dest, os.path.join(ROOT, "backups", f"config-{stamp}.js"))
            with open(dest, "wb") as out:
                out.write(data)
            written.append(path)
        self.log_message("Guardado: %s", ", ".join(written))
        return self._json(200, {"ok": True, "written": written, "backup": f"backups/config-{stamp}.js"})


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
handler = functools.partial(Handler, directory=ROOT)
print(f"Nodo:  http://localhost:{port}/?src=prueba\nPanel: http://localhost:{port}/dashboard.html")
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
