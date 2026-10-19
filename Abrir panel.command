#!/bin/zsh
# Doble clic para encender el servidor local y abrir el panel en el navegador.
# Deja esta ventana abierta mientras trabajas; ciérrala para apagar el servidor.
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:$PORT/dashboard.html"

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "El servidor ya estaba encendido."
  open "$URL"
  exit 0
fi

(sleep 1; open "$URL") &
echo "Servidor encendido. Para apagarlo, cierra esta ventana."
echo ""
python3 servir.py $PORT
