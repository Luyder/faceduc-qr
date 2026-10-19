/* ============================================================
   CONFIGURACIÓN DEL NODO
   Se puede editar desde dashboard.html ▸ Configurar o a mano.

   🔒 REGLA DE ORO: los QR impresos solo contienen la dirección del
   nodo y los "id" (?lic=…&src=…&to=…). Por eso:
     ✅ Puedes cambiar cuando quieras: textos, url de destino, colores,
        mensajes, orden, imágenes, lugares… Los QR siguen funcionando.
     ⛔ NO cambies ni borres un "id" que ya esté impreso en un QR.
        Si necesitas renombrarlo, pon el id viejo en "aliases".
        Si un enlace ya no debe verse, usa hidden: true en vez de borrarlo.
   ============================================================ */
window.HUB_CONFIG = {
  // Encabezado
  title: "Facultad de Educación",
  subtitle: "Elige a dónde quieres ir",
  avatar: "",                // logo redondo sobre el título. Vacío = sin logo
  accent: "#2347c5",         // color cuando no hay licenciatura elegida

  // URL del Web App de Google Apps Script (ver README). Vacío = solo modo prueba en el navegador.
  endpoint: "",

  // Ubicación aproximada (país/ciudad) vía ipapi.co. No se guarda la IP.
  geo: false,

  // Número de WhatsApp de asesoría (con indicativo, sin + ni espacios)
  whatsapp: "573103018445",

  // Aviso breve de privacidad al pie de la página
  privacyNote: "Registramos datos anónimos de visita (dispositivo, origen y enlace elegido) para mejorar nuestros servicios. No guardamos datos personales.",

  // Licenciaturas: cada una es un nodo propio (?lic=ID).
  //   id 🔒 fijo · name nombre tras «Licenciatura en» · color identidad · pensum enlace al plan de estudios
  //   whatsappMessage (opcional) reemplaza el mensaje general de WhatsApp para esta licenciatura
  programs: [
    { id: "artes", name: "Artes", color: "#ff5900", snies: "105047", semesters: 8, credits: 123, pensum: "https://view.genially.com/65b2b7be8cc4be0014e4e627/interactive-content-licenciatura-en-artes" },
    { id: "biologia", name: "Biología", color: "#00bf63", snies: "107055", semesters: 8, credits: 124, pensum: "https://view.genially.com/65cf848b2b749c0014027e18/interactive-content-licenciatura-en-biologia" },
    { id: "infantil", name: "Educación Infantil", color: "#f7aac8", snies: "106784", semesters: 8, credits: 123, pensum: "https://view.genially.com/654a974ca555c30011169793/interactive-content-licenciatura-en-educacion-infantil" },
    { id: "espanol-filologia", name: "Español y Filología", color: "#d42e2b", snies: "106785", semesters: 8, credits: 123, pensum: "https://view.genially.com/663a7abaa5106f00140f3077/interactive-content-licenciatura-en-espanol-y-filologia" },
    { id: "filosofia", name: "Filosofía", color: "#7300ff", snies: "107326", semesters: 8, credits: 124, pensum: "https://view.genially.com/677ff34abbd1a9c398d8a7a5/interactive-content-licenciatura-en-filosofia" },
    { id: "fisica", name: "Física", color: "#1852c8", snies: "106782", semesters: 8, credits: 125, pensum: "https://view.genially.com/677ff457decde99c7c48f645/interactive-content-licenciatura-en-fisica" },
    { id: "historia", name: "Historia", color: "#eba636", snies: "106783", semesters: 8, credits: 123, pensum: "https://view.genially.com/677ff48942cd34c9f6fc4d7f/interactive-content-licenciatura-en-historia" },
    { id: "matematicas", name: "Matemáticas", color: "#96cdf5", snies: "105053", semesters: 8, credits: 125, pensum: "https://view.genially.com/677ff4ae42cd34c9f6fc62d4/interactive-content-licenciatura-en-matematicas" },
    { id: "quimica", name: "Química", color: "#00a3a3", snies: "107054", semesters: 8, credits: 125, pensum: "https://view.genially.com/677ff4dbdecde99c7c495e3e/interactive-content-licenciatura-en-quimica" }
  ],

  // Botones de la página (los mismos para todas las licenciaturas).
  //   id 🔒 fijo · label texto · icon emoji opcional · hidden oculto (QR directos siguen funcionando)
  //   type "url" usa url · "pensum" usa el pensum de la licenciatura · "whatsapp" usa message ({programa} = nombre)
  //   aliases = ids antiguos que siguen llevando a este botón
  links: [
    { id: "programa", label: "Pensum del programa", type: "pensum" },
    { id: "becas", label: "Becas y apoyos financieros", url: "https://apoyofinanciero.uniandes.edu.co/pregrado" },
    { id: "contacto", label: "Asesoría por WhatsApp", type: "whatsapp", message: "Hola, quiero recibir asesoría sobre la Licenciatura en {programa}." },
    { id: "vida", label: "Vida universitaria", url: "https://www.uniandes.edu.co/es/vida-universitaria" },
    { id: "inscripcion", label: "Inscríbete", url: "https://mibanner.uniandes.edu.co/PROD/bwskwalog.P_DispLoginNon" },
    { id: "calendario", label: "Calendario de sesiones", url: "https://calendar.google.com", hidden: true }
  ],

  // Orígenes: dónde está impreso cada QR (?src=ID).
  //   id 🔒 fijo · label nombre · type formato · place ubicación · image vista previa en previews/
  sources: [
    { id: "afiche-biblioteca", label: "Afiche Licenciaturas", type: "Afiche", place: "Biblioteca General, piso 1", image: "previews/afiche-licenciaturas.webp" },
    { id: "volante-evento", label: "Volante bienvenida", type: "Volante", place: "Evento de bienvenida, Auditorio Lleras" },
    { id: "pantalla-lobby", label: "Pantalla lobby", type: "Pantalla", place: "Lobby edificio Facultad" },
    { id: "correo", label: "Correo masivo", type: "Correo", place: "Boletín a aspirantes" }
  ]
};
