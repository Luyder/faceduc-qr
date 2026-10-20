# Nodo QR — divisor de enlaces con analítica de entradas y salidas

Una página tipo *Linktree/Bitly* que se publica gratis en **GitHub Pages** y registra:

- **Entradas**: qué QR (o fuente) trajo a cada persona, cuándo (día/hora), dispositivo, sistema, navegador o app (Instagram, Facebook…), idioma, visitante nuevo o recurrente, y opcionalmente país/ciudad.
- **Salidas**: qué enlace eligió, cuánto tardó en decidir, cuánto tiempo estuvo en la página y si se fue sin elegir (abandono).
- **Flujo**: matriz QR → enlace para comparar qué punto de entrada convierte mejor.

Los datos se guardan en una **Hoja de cálculo de Google** (gratis, vía Apps Script). No usa cookies de terceros ni guarda IP.

```
QR-Hub/
├── index.html          ← página pública (el nodo divisor)
├── dashboard.html      ← panel de analítica + generador de QR
├── config.js           ← configuración (se edita desde el panel ▸ Configurar)
├── servir.py           ← servidor local para probar y guardar cambios
├── assets/             ← estilos y scripts
└── apps-script/Code.gs ← backend para Google Sheets
```

---

## 0. Un nodo por licenciatura

Cada licenciatura tiene su propia página con su color, su pensum y su mensaje de WhatsApp:

| URL | Qué muestra |
|---|---|
| `…/?lic=artes&src=afiche-biblioteca` | Página de la **Licenciatura en Artes** |
| `…/?lic=fisica&src=volante-evento&to=programa` | Lleva directo al **pensum de Física** |
| `…/?src=afiche-biblioteca` (sin `lic`) | Página principal: las 9 licenciaturas y, debajo, cita por Teams, becas, etc. |

Los botones son los mismos para todas; dos cambian solos según la licenciatura:

- **Pensum del programa** (`type: "pensum"`) abre el plan de estudios de esa licenciatura.
- **Conoce la licenciatura** (`type: "page"`) abre su página oficial; en la página principal abre `facultyPage` con el texto `homeLabel`.
- **Agenda una asesoría por Teams** abre el servicio «Pregrado – Asesoría Personalizada» de Microsoft Bookings (con Valentina Aldana Sabogal). Reemplaza al botón de WhatsApp, que quedó oculto (`hidden: true`) sin romper QR; su mensaje por licenciatura sigue configurado por si se quiere volver a mostrar.
- Los enlaces con `embed: true` (el pensum) se abren **dentro de la misma página**; los demás enlaces externos se abren en **una pestaña nueva** para que el nodo siga abierto.

Los ids de las licenciaturas (`artes`, `biologia`, `infantil`, `espanol-filologia`, `filosofia`, `fisica`, `historia`, `matematicas`, `quimica`) quedan fijos 🔒 igual que los demás.

### Pensum interactivo

`pensum/ver.html?p=artes` muestra el plan de estudios de Artes con el diseño hecho en Figma: al tocar un curso aparece su descripción, créditos y requisitos, y se resaltan los cursos que van antes, a la par y después. En celular se ve un semestre a la vez. Los datos están en `pensum/data/artes.js` (descripciones tomadas del pensum oficial en Genially). Para otra licenciatura: crea `pensum/data/<id>.js` con la misma estructura y pon `pensum: "pensum/ver.html?p=<id>"` en `config.js`.

## 1. Configura tus enlaces

**Sin tocar código:** abre `dashboard.html` ▸ pestaña **Configurar**. Ahí editas el título, el logo, los botones (texto, destino, ícono, visible/oculto, orden) y los orígenes (nombre, tipo, ubicación, imagen), con una vista previa en vivo de la página. El editor:

- bloquea 🔒 los id que ya existen y, si renombras uno, deja el viejo como alias;
- al «Eliminar» un botón primero lo oculta, para no romper QR directos;
- revisa la configuración y no deja guardar si algo rompería un QR;
- reduce y comprime a WebP las imágenes que subas.

El botón de guardar cambia según dónde estés:

| Dónde | Qué hace el botón |
|---|---|
| En tu computador con `python3 servir.py` | **Guardar en este computador**: escribe `config.js` e imágenes en la carpeta (copia de respaldo en `backups/`) |
| En el sitio publicado, con la sección 05 completa | **Publicar en GitHub**: guarda directo en el repositorio con un token; el sitio se actualiza en 1–2 min |
| En cualquier otro caso | **Descargar config.js**: lo subes tú a GitHub (y las imágenes a `previews/`) |

> Token de GitHub: *Settings ▸ Developer settings ▸ Personal access tokens ▸ Fine-grained tokens*, acceso **solo a este repositorio**, permiso **Contents: Read and write**. Se usa únicamente desde tu navegador; no lo actives «Recordar» en equipos compartidos.

También puedes editar `config.js` a mano: título, enlaces (`links`) y puntos de entrada (`sources`, uno por cada lugar donde imprimirás un QR).

Cada origen puede llevar una **vista previa de la pieza** (afiche, volante, pantalla…): guarda la imagen en `previews/` (WebP o JPG, idealmente < 300 KB) y agrégala al origen:

```js
{ id: "afiche-biblioteca", label: "Afiche Licenciaturas", type: "Afiche",
  place: "Biblioteca General, piso 1", image: "previews/afiche-licenciaturas.webp" }
```

La imagen aparece en la galería de **Orígenes del QR**, en la ficha de detalle de cada origen y en el generador de QR. En el generador también puedes usar **Probar otra imagen** para ver una pieza sin guardarla todavía.

## 2. Crea el backend (5 minutos)

1. Crea una Hoja de cálculo nueva en Google Drive (ej. «Nodo QR – datos»).
2. Menú **Extensiones ▸ Apps Script**. Borra el contenido y pega todo `apps-script/Code.gs`. Guarda.
3. **⚙ Configuración del proyecto ▸ Propiedades del script ▸ Agregar propiedad**:
   `ADMIN_KEY` = una clave larga inventada por ti (es la que pedirá el panel para leer los datos).
4. En el editor, selecciona la función `setup` y pulsa **Ejecutar**. Acepta los permisos (te pedirá acceso a tu hoja).
5. **Implementar ▸ Nueva implementación ▸ tipo: Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
6. Copia la URL que termina en `/exec` y pégala en `config.js` → `endpoint: "https://script.google.com/macros/s/…/exec"`.

> Si después cambias `Code.gs`, usa **Implementar ▸ Gestionar implementaciones ▸ Editar ▸ Nueva versión** para que la URL siga siendo la misma.

## 3. Publica en GitHub Pages

1. Crea un repositorio público en GitHub (ej. `nodo-qr`) y sube el contenido de esta carpeta (incluido `.nojekyll`).
   Desde la terminal:
   ```bash
   git init && git add . && git commit -m "Nodo QR" && git branch -M main
   ```
   ```bash
   git remote add origin https://github.com/TU-USUARIO/nodo-qr.git && git push -u origin main
   ```
2. En el repo: **Settings ▸ Pages ▸ Source: Deploy from a branch ▸ main / (root)**.
3. En 1–2 minutos estará en `https://TU-USUARIO.github.io/nodo-qr/`.

## 4. Genera los QR

Abre `https://TU-USUARIO.github.io/nodo-qr/dashboard.html` ▸ pestaña **Generar QR**.

- **Nodo divisor**: el QR abre la página con todos los enlaces → `…/?src=afiche-biblioteca`
- **Directo (modo acortador)**: salta la página y redirige a un enlace, pero igual registra la entrada → `…/?src=afiche-biblioteca&to=inscripcion`
- **Campaña** opcional para separar periodos → `&utm_campaign=semestre-2026-2`

Descarga el PNG (lleva el nombre del punto debajo) y úsalo en afiches, volantes, pantallas, etc. Usa **un QR distinto por lugar**: así sabrás cuál funciona mejor.

## 🔒 Reglas para que los QR impresos nunca se rompan

Un QR impreso solo contiene **la dirección del nodo** y **los id** (`?src=afiche-biblioteca`, `&to=inscripcion`). Todo lo demás se lee de `config.js` cada vez que alguien escanea.

| Puedes cambiar sin miedo | No cambies |
|---|---|
| Textos de los botones (`label`), título, subtítulo | El `id` de un enlace u origen que ya esté impreso |
| El destino (`url`) de cualquier enlace | El nombre del repositorio o del usuario de GitHub (cambia la dirección) |
| Íconos, colores, orden de los botones | El nombre del archivo `index.html` |
| Imágenes, lugares y tipos de los orígenes | |

- **¿Quieres renombrar un id?** Ponle el nuevo y deja el viejo en `aliases`: los QR viejos siguen funcionando y sus datos se suman al nuevo.
  ```js
  { id: "inscripcion-2027", aliases: ["inscripcion"], label: "Inscripciones 2027", url: "https://…" }
  ```
- **¿Un enlace ya no debe verse?** No lo borres: ponle `hidden: true`. Desaparece de la página, pero un QR directo a él sigue funcionando.
- **¿Borraste un enlace igual?** Un QR directo a ese id abre la página completa en lugar de dar error.
- **¿Te equivocaste al editar `config.js`?** La página pública no queda en blanco: muestra un botón de respaldo hacia el sitio de la Facultad (se configura en `FALLBACK`, dentro de `index.html`). El panel avisa con un mensaje rojo.
- **Antes de publicar un cambio**, abre el panel ▸ **Generar QR** ▸ **¿Los QR están a salvo?**: detecta ids repetidos, enlaces sin url e imágenes que no existen.
- **¿Quieres poder mudar el sitio algún día?** Configura un dominio propio (ej. `qr.tudominio.co`) en GitHub Pages *antes* de imprimir; así podrás cambiar de repositorio o de servicio sin reimprimir.

## 5. Mira los datos

`dashboard.html` ▸ escribe tu `ADMIN_KEY` ▸ **Cargar datos**. Filtra por periodo, QR o dispositivo y exporta a CSV. Los datos crudos también están en la hoja «eventos».

| Métrica | Qué significa |
|---|---|
| Sesiones | Cada vez que alguien abre el nodo (un escaneo) |
| Visitantes únicos | Navegadores distintos (anónimos) |
| Conversión | % de sesiones que eligieron algún enlace |
| Abandono | % que se fue sin elegir |
| Permanencia | Tiempo visible en la página (mediana) |
| Tiempo hasta el clic | Cuánto tardan en decidir (mediana) |

**Sin backend todavía?** El panel tiene **Ver demo** (datos ficticios) y **Datos de prueba de este navegador** (lo que hayas hecho en `index.html` desde el mismo navegador).

## Probar en local

```bash
python3 servir.py
```

Abre `http://localhost:8765/?src=prueba` y luego `http://localhost:8765/dashboard.html`.

## Notas de privacidad y límites

- El visitante se identifica con un ID aleatorio en `localStorage`; no hay nombres, correos ni IP.
- `geo: true` consulta `ipapi.co` desde el navegador del visitante (gratis hasta ~1.000 consultas/día) y guarda solo país y ciudad.
- Ajusta el texto de `privacyNote` a la política de tratamiento de datos de tu institución (Ley 1581 de 2012 en Colombia).
- El endpoint de escritura es público (como cualquier analítica web): alguien podría enviar eventos falsos. La lectura sí requiere la clave.
- Apps Script tiene cuotas diarias generosas (miles de eventos/día); para volúmenes muy grandes conviene migrar a Supabase o similar.
- Los bloqueadores de anuncios estrictos pueden impedir algunos registros, como en cualquier analítica.
