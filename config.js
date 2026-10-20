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

  // Página que abre el botón «Conoce…» en la página principal (sin licenciatura elegida)
  facultyPage: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado",

  // Sello como el de los folletos. show: false para ocultarlo
  badge: { show: true, line1: "¡Tenemos beca del", big: "66%", line2: "pregunta por ella", url: "https://apoyofinanciero.uniandes.edu.co/decidi-ensenar", label: "Beca Decidí Enseñar: 66% al ser admitido" },

  // Aviso breve de privacidad al pie de la página
  privacyNote: "Registramos datos anónimos de visita (dispositivo, origen y enlace elegido) para mejorar nuestros servicios. No guardamos datos personales.",

  // Licenciaturas: cada una es un nodo propio (?lic=ID).
  //   id 🔒 fijo · name nombre tras «Licenciatura en» · color identidad · page página oficial · pensum plan de estudios
  //   tagline texto bajo el título (el de la página oficial)
  //   whatsappMessage (opcional) reemplaza el mensaje general de WhatsApp para esta licenciatura
  programs: [
    { id: "artes", name: "Artes", tagline: "Crea, enseña y transforma. En la Licenciatura en Artes unirás la expresión artística con la pedagogía para formar desde la libertad creativa y el pensamiento crítico.", color: "#ff5900", snies: "105047", semesters: 8, credits: 123, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-artes", pensum: "pensum/ver.html?p=artes" },
    { id: "biologia", name: "Biología", tagline: "Explora la vida, comprende su complejidad y aprende a enseñarla. En la Licenciatura en Biología unirás ciencia y pedagogía para inspirar nuevas formas de entender la naturaleza.", color: "#00bf63", snies: "107055", semesters: 8, credits: 124, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-biologia", pensum: "https://view.genially.com/65cf848b2b749c0014027e18/interactive-content-licenciatura-en-biologia" },
    { id: "infantil", name: "Educación Infantil", tagline: "Forma parte de las primeras experiencias que transforman vidas. En la Licenciatura en Educación Infantil aprenderás a enseñar desde el juego, el arte y la exploración del mundo.", color: "#f7aac8", snies: "106784", semesters: 8, credits: 123, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-infantil", pensum: "https://view.genially.com/654a974ca555c30011169793/interactive-content-licenciatura-en-educacion-infantil" },
    { id: "espanol-filologia", name: "Español y Filología", tagline: "Explora la lengua, la literatura y la enseñanza. En Español y Filología aprenderás a inspirar pensamiento crítico y amor por las palabras en el aula.", color: "#d42e2b", snies: "106785", semesters: 8, credits: 123, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-espanol-filologia", pensum: "https://view.genially.com/663a7abaa5106f00140f3077/interactive-content-licenciatura-en-espanol-y-filologia" },
    { id: "filosofia", name: "Filosofía", tagline: "Piensa, enseña y transforma. En la Licenciatura en Filosofía aprenderás a guiar el pensamiento crítico y a inspirar la reflexión desde la libertad y el diálogo con los grandes pensadores.", color: "#7300ff", snies: "107326", semesters: 8, credits: 124, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-filosofia", pensum: "https://view.genially.com/677ff34abbd1a9c398d8a7a5/interactive-content-licenciatura-en-filosofia" },
    { id: "fisica", name: "Física", tagline: "Comprende la naturaleza y aprende a enseñarla. En la Licenciatura en Física unirás ciencia y pedagogía para inspirar curiosidad y pensamiento crítico en el aula.", color: "#1852c8", snies: "106782", semesters: 8, credits: 125, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-fisica", pensum: "https://view.genially.com/677ff457decde99c7c48f645/interactive-content-licenciatura-en-fisica" },
    { id: "historia", name: "Historia", tagline: "La Licenciatura en Historia integra formación histórica y pedagógica para formar docentes que enseñen con sentido crítico y promuevan ciudadanía reflexiva y participativa.", color: "#eba636", snies: "106783", semesters: 8, credits: 123, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-historia", pensum: "https://view.genially.com/677ff48942cd34c9f6fc4d7f/interactive-content-licenciatura-en-historia" },
    { id: "matematicas", name: "Matemáticas", tagline: "La Licenciatura en Matemáticas une la formación científica y pedagógica para enseñar con rigor, creatividad e innovación, impulsando el pensamiento lógico y cuantitativo.", color: "#96cdf5", snies: "105053", semesters: 8, credits: 125, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-matematicas", pensum: "https://view.genially.com/677ff4ae42cd34c9f6fc62d4/interactive-content-licenciatura-en-matematicas" },
    { id: "quimica", name: "Química", tagline: "La Licenciatura en Química une la ciencia y la pedagogía para formar docentes capaces de enseñar con rigor, creatividad y fomentar el pensamiento científico.", color: "#00a3a3", snies: "107054", semesters: 8, credits: 125, page: "https://educacion.uniandes.edu.co/es/oferta-academica/pregrado/licenciatura-quimica", pensum: "https://view.genially.com/677ff4dbdecde99c7c495e3e/interactive-content-licenciatura-en-quimica" }
  ],

  // Botones de la página (los mismos para todas las licenciaturas).
  //   id 🔒 fijo · label texto · icon emoji opcional · hidden oculto (QR directos siguen funcionando)
  //   type "url" usa url · "pensum" pensum de la licenciatura · "page" su página oficial · "whatsapp" usa message ({programa} = nombre)
  //   embed: true se abre dentro de la página · homeLabel texto en la página principal
  //   aliases = ids antiguos que siguen llevando a este botón
  links: [
    { id: "programa", label: "Pensum del programa", type: "pensum", embed: true },
    { id: "licenciatura", label: "Conoce la licenciatura", type: "page", homeLabel: "Conoce las licenciaturas" },
    { id: "becas", label: "Becas y apoyos financieros", url: "https://apoyofinanciero.uniandes.edu.co/pregrado" },
    { id: "asesoria", label: "Agenda una asesoría por Teams", url: "https://bookings.cloud.microsoft/book/AsesorapersonalizadaFacultaddeEducacin@uniandes.onmicrosoft.com/s/WJrHx-R7akOS25iPDU84FA2" },
    { id: "contacto", label: "Asesoría por WhatsApp", type: "whatsapp", message: "Hola, quiero recibir asesoría sobre la Licenciatura en {programa}.", hidden: true },
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
