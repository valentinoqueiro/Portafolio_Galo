// ═══════════════════════════════════════════════════════
//  main.js — Portafolio Editor de Video
// ═══════════════════════════════════════════════════════

const VIDEOS = [
  'videos /AD %231.mp4',
  'videos /AD %236 Hook %233.mp4',
  'videos /DA-R015.mp4',
  'videos /Organico %2312.mp4',
  'videos /Reel 3- ranger 570.mp4',
  'videos /doble Ranger.mp4',
];

// Intervalo entre cambio de videos (ms)
const INTERVALO_VIDEO = 5000;

document.addEventListener('DOMContentLoaded', () => {
  iniciarCursor();
  iniciarParticulas();
  iniciarTypewriter();
  generarMarcasTimeline();
  generarWaveformAudio();
  iniciarReproductor();
});

// Miniaturas para el hero — 6 botones (uno por video)
const MINIATURAS_VIDEOS = [
  { nombre: 'AD #1', duracion: '0:30' },
  { nombre: 'AD #6 Hook #3', duracion: '0:28' },
  { nombre: 'DA-R015', duracion: '0:45' },
  { nombre: 'Organico #12', duracion: '1:12' },
  { nombre: 'Reel 3 Ranger', duracion: '0:22' },
  { nombre: 'Doble Ranger', duracion: '0:35' },
];

// ─── Reproductor con crossfade y color sampler ────────
function iniciarReproductor() {
  const videoA    = document.getElementById('video-a');
  const videoB    = document.getElementById('video-b');
  const canvas    = document.getElementById('canvas-color');
  const ctx       = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  const miniaturas = document.querySelectorAll('.miniatura');
  const progresoFill = document.getElementById('progreso-fill');
  const tiempoEl  = document.getElementById('video-tiempo');

  // Elementos extra para animar el resto de UI
  const timelineCabezal = document.getElementById('timeline-cabezal');
  const tlTimecode = document.getElementById('tl-timecode');
  const proyectoProgresoFill = document.getElementById('proyecto-progreso-fill');
  const proyectoDuracion = document.getElementById('proyecto-duracion');
  const proyectoNombre = document.getElementById('proyecto-nombre');

  if (!videoA || !videoB) return;

  // Estado
  let indiceActual = 0;
  let videoActivo  = videoA;  // el que está visible
  let videoOculto  = videoB;  // el que precarga el siguiente
  let intervalo;
  let colorSamplerInterval;

  // Precargar todos los srcs en el oculto se hace dinámicamente
  videoActivo.src = VIDEOS[0];
  videoActivo.load();
  videoActivo.play().catch(() => {});

  // ── Cambiar a un video específico ──
  function cambiarA(indice) {
    if (indice === indiceActual) return;
    indiceActual = indice;

    // Actualizar nombre del proyecto activo
    if (proyectoNombre) {
      const parts = VIDEOS[indice].split('/');
      proyectoNombre.textContent = parts[parts.length - 1]; // Toma solo el nombre del archivo
    }

    // "Mover" aleatoriamente los clips del timeline al cambiar proyecto
    document.querySelectorAll('.pista-clip').forEach(clip => {
      clip.style.left = Math.floor(Math.random() * 60) + '%';
      clip.style.width = Math.floor(Math.random() * 30 + 10) + '%';
    });

    // Preparar el video oculto con el nuevo src
    videoOculto.src = VIDEOS[indice];
    videoOculto.load();
    videoOculto.currentTime = 0;

    videoOculto.play().then(() => {
      // Crossfade: mostrar el oculto, ocultar el activo
      videoOculto.classList.add('activa');
      videoActivo.classList.remove('activa');

      // Intercambiar referencias
      const temp = videoActivo;
      videoActivo = videoOculto;
      videoOculto = temp;

      // Actualizar miniaturas activas
      miniaturas.forEach((m, i) => m.classList.toggle('activa', i === indiceActual));

      // Reiniciar intervalo automático
      reiniciarIntervalo();
    }).catch(() => {});
  }

  // ── Avanzar al siguiente ──
  function siguiente() {
    cambiarA((indiceActual + 1) % VIDEOS.length);
  }

  // ── Intervalo automático ──
  function reiniciarIntervalo() {
    clearInterval(intervalo);
    intervalo = setInterval(siguiente, INTERVALO_VIDEO);
  }
  reiniciarIntervalo();

  // ── Clicks en miniaturas ──
  miniaturas.forEach(btn => {
    btn.addEventListener('click', () => {
      cambiarA(parseInt(btn.dataset.index));
    });
  });

  // ── Progreso del video activo ──
  function actualizarProgreso() {
    if (!videoActivo || !videoActivo.duration) return;
    const pct = (videoActivo.currentTime / videoActivo.duration) * 100;
    
    // Barras de progreso
    if (progresoFill) progresoFill.style.width = pct + '%';
    if (proyectoProgresoFill) proyectoProgresoFill.style.width = pct + '%';

    // Cabezal que avanza en todo el timeline inferior
    if (timelineCabezal) timelineCabezal.style.left = pct + '%';

    // Timecode global
    const seg = Math.floor(videoActivo.currentTime);
    const mm  = String(Math.floor(seg / 60)).padStart(2, '0');
    const ss  = String(seg % 60).padStart(2, '0');
    
    // Calcular "frames" relativos a 60fps
    const frames = String(Math.floor((videoActivo.currentTime % 1) * 60)).padStart(2, '0');
    
    if (tiempoEl) tiempoEl.textContent = `00:${mm}:${ss}`;
    if (proyectoDuracion) proyectoDuracion.textContent = `${mm}:${ss}`;
    if (tlTimecode) tlTimecode.textContent = `00:${mm}:${ss}:${frames}`;
  }

  setInterval(actualizarProgreso, 1000 / 60); // A 60fps para fluidez del timecode y cabezal

  // ── Color sampler ──────────────────────────────────
  // Fallbacks predefinidos en caso de error CORS local
  const fallbackColors = [
    {r: 120, g: 100, b: 85},  // V1 - Muted brown
    {r: 90,  g: 110, b: 120}, // V2 - Blueish grey
    {r: 130, g: 125, b: 110}, // V3 - Warm sand
    {r: 100, g: 130, b: 105}, // V4 - Desaturated green
    {r: 140, g: 110, b: 90}   // V5 - Terracotta
  ];

  function extraerColorDominante() {
    if (!ctx || !videoActivo || videoActivo.readyState < 2) return null;

    try {
      ctx.drawImage(videoActivo, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 32) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) return null;
      return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
    } catch {
      // Retorna null si 'getImageData' tira error de Security/CORS por protocolo file:///
      return null;
    }
  }

  function desaturar(r, g, b, factor = 0.12) {
    const br = 255, bg = 255, bb = 255;
    return {
      r: Math.round(br + (r - br) * factor),
      g: Math.round(bg + (g - bg) * factor),
      b: Math.round(bb + (b - bb) * factor),
    };
  }

  function aplicarColorACards(color) {
    if (!color) return;
    // Reducimos la desaturación (de 0.14 a 0.28) para que el color sea el doble de visible / intenso
    const c = desaturar(color.r, color.g, color.b, 0.28);
    const fondo  = `rgba(${c.r}, ${c.g}, ${c.b}, 0.65)`;
    const borde  = `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`;

    document.querySelectorAll('.card').forEach(card => {
      card.style.background    = fondo;
      card.style.borderColor   = borde;
    });

    const visor = document.querySelector('.visor-central');
    if (visor) {
      const cv = desaturar(color.r, color.g, color.b, 0.12);
      visor.style.backgroundColor = `rgb(${cv.r}, ${cv.g}, ${cv.b})`;
    }

    const cClip   = desaturar(color.r, color.g, color.b, 0.45);
    const cAudio  = desaturar(color.r, color.g, color.b, 0.35);
    
    document.querySelectorAll('.clip-v1').forEach(el => el.style.background = `rgba(${cClip.r}, ${cClip.g}, ${cClip.b}, 0.65)`);
    document.querySelectorAll('.clip-v2').forEach(el => el.style.background = `rgba(${cClip.r}, ${cClip.g}, ${cClip.b}, 0.55)`);
    document.querySelectorAll('.wave-bar').forEach(el => el.style.background = `rgba(${cAudio.r}, ${cAudio.g}, ${cAudio.b}, 0.55)`);
  }

  colorSamplerInterval = setInterval(() => {
    let color = extraerColorDominante();
    if (!color) color = fallbackColors[indiceActual]; // Fallback para file:///
    aplicarColorACards(color);
  }, 2000);

  videoActivo.addEventListener('loadeddata', () => {
    let color = extraerColorDominante();
    if (!color) color = fallbackColors[indiceActual];
    aplicarColorACards(color);
  });
  
  // Fuerza la paleta inicial al recargar la pág independientemente del loadeddata
  setTimeout(() => {
    let color = extraerColorDominante();
    if (!color) color = fallbackColors[indiceActual];
    aplicarColorACards(color);
  }, 100);
}

// ─── Generación progresiva de Waveform (Audio) ─────────
function generarWaveformAudio() {
  const contenedor = document.getElementById('carril-audio');
  if (!contenedor) return;

  // Renderiza alrededor de 120 barritas para ocupar toda la superficie interactiva
  for (let i = 0; i < 120; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    
    // Aleatoriedad para la duración de la animación y el delay
    const dur = 0.4 + Math.random() * 0.8;
    const del = Math.random() * -2; // negativo para que arranquen desfasadas
    
    bar.style.setProperty('--dur', dur + 's');
    bar.style.setProperty('--delay', del + 's');
    contenedor.appendChild(bar);
  }
}

// ─── Marcas de la regla del timeline ─────────────────
function generarMarcasTimeline() {
  const contenedor = document.getElementById('regla-marcas');
  if (!contenedor) return;

  for (let i = 0; i <= 60; i++) {
    const marca = document.createElement('div');
    const esMayor = i % 5 === 0;
    marca.className = 'regla-marca' + (esMayor ? ' mayor' : '');

    if (esMayor) {
      const num = document.createElement('span');
      num.className = 'regla-num';
      num.textContent = i === 0 ? '' : `${i}s`;
      marca.appendChild(num);
    }
    contenedor.appendChild(marca);
  }
}

// ─── Cursor personalizado ─────────────────────────────
function iniciarCursor() {
  const punto  = document.getElementById('cursor-punto');
  const anillo = document.getElementById('cursor-anillo');
  if (!punto || !anillo) return;

  let rX = 0, rY = 0;
  let pX = 0, pY = 0;

  document.addEventListener('mousemove', (e) => {
    pX = e.clientX;
    pY = e.clientY;
    punto.style.left = pX + 'px';
    punto.style.top  = pY + 'px';
  });

  function animarAnillo() {
    rX += (pX - rX) * 0.12;
    rY += (pY - rY) * 0.12;
    anillo.style.left = rX + 'px';
    anillo.style.top  = rY + 'px';
    requestAnimationFrame(animarAnillo);
  }
  animarAnillo();

  document.querySelectorAll('button, a, [data-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      punto.style.width  = '3px';
      punto.style.height = '3px';
      anillo.style.width  = '46px';
      anillo.style.height = '46px';
      anillo.style.opacity = '0.6';
    });
    el.addEventListener('mouseleave', () => {
      punto.style.width  = '6px';
      punto.style.height = '6px';
      anillo.style.width  = '28px';
      anillo.style.height = '28px';
      anillo.style.opacity = '1';
    });
  });
}

// ─── Partículas de fondo (canvas) ────────────────────
function iniciarParticulas() {
  const canvas = document.getElementById('canvas-particulas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particulas = [];
  const CANTIDAD = 40;

  function redimensionar() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function crearParticula() {
    return {
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r:  Math.random() * 1.0 + 0.2,
      a:  Math.random() * 0.15 + 0.03,
      color: Math.random() > 0.5 ? '44, 42, 37' : '120, 115, 100',
    };
  }

  function inicializar() {
    redimensionar();
    particulas = Array.from({ length: CANTIDAD }, crearParticula);
  }

  function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particulas.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.a})`;
      ctx.fill();
    });

    for (let i = 0; i < particulas.length; i++) {
      for (let j = i + 1; j < particulas.length; j++) {
        const dx = particulas[i].x - particulas[j].x;
        const dy = particulas[i].y - particulas[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          const alpha = (1 - dist / 90) * 0.03;
          ctx.beginPath();
          ctx.moveTo(particulas[i].x, particulas[i].y);
          ctx.lineTo(particulas[j].x, particulas[j].y);
          ctx.strokeStyle = `rgba(44, 42, 37, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(dibujar);
  }

  inicializar();
  dibujar();
  window.addEventListener('resize', redimensionar);
}

// ─── Typewriter para tagline ──────────────────────────
function iniciarTypewriter() {
  const el = document.getElementById('tagline-texto');
  if (!el) return;

  const textos = [
    'Short Content',
    'High Retention',
    'Vertical Video'
  ];

  let idxTexto = 0, idxChar = 0;
  let borrando = false, pausando = false;

  function escribir() {
    if (pausando) return;
    const texto = textos[idxTexto];
    if (!borrando) {
      el.textContent = texto.slice(0, idxChar + 1);
      idxChar++;
      if (idxChar === texto.length) {
        pausando = true;
        setTimeout(() => { pausando = false; borrando = true; }, 2200);
      } else {
        setTimeout(escribir, 45);
      }
    } else {
      el.textContent = texto.slice(0, idxChar - 1);
      idxChar--;
      if (idxChar === 0) {
        borrando = false;
        idxTexto = (idxTexto + 1) % textos.length;
        setTimeout(escribir, 300);
      } else {
        setTimeout(escribir, 25);
      }
    }
  }
  setTimeout(escribir, 1200);
}

// ─── LÓGICA DE SECCIÓN CLIENTES (02) ───────────────────
function initClientesSection() {
  const cVideo = document.getElementById('c-video');
  const cFoto = document.getElementById('c-foto');
  if (!cVideo || !cFoto) return;

  const clientesData = [
    {
      id: "ID-01",
      nombre: "David Otálora",
      rol: "E-COMMERCE & VIRALIDAD",
      texto: "Estrategias de viralización orgánica y crecimiento exponencial de comunidades. Enfoque en la retención absoluta del espectador mediante storytelling dinámico, ritmo acelerado y ganchos emocionales para escalar ventas.",
      kpi1: "+13M Views",
      kpi2: "Reel 9:16",
      foto: "ClientesVIP/David Otalora.jpg",
      videoSrc: "ClientesVIP/Plan de contenido.mp4",
      videoName: "David_Otalora_Viral_v2.mp4"
    },
    {
      id: "ID-02",
      nombre: "Marcos Razzetti",
      rol: "EMPRENDEDOR & E-COMMERCE",
      texto: "Modelos de negocio de e-commerce a escala global y funnels de conversión avanzados. Optimización de rentabilidad máxima mediante estrategias de marketing automatizadas y logística eficiente.",
      kpi1: "+35M Views",
      kpi2: "TikTok 9:16",
      foto: "ClientesVIP/marcos-razzetti.jpg",
      videoSrc: "ClientesVIP/Marcos %233.mp4",
      videoName: "MR_Ecom_Scale_1080p.mp4"
    },
    {
      id: "ID-03",
      nombre: "Oscar Hinojosa",
      rol: "MARKETING DIGITAL",
      texto: "Estrategias de posicionamiento y lanzamientos digitales de alta conversión. Experto en captación de clientes, storytelling y ventas high-ticket, transformando influencia en negocios escalables.",
      kpi1: "+$1M Reven.",
      kpi2: "Reel 9:16",
      foto: "ClientesVIP/Oscar hinojosa.jpg",
      videoSrc: "ClientesVIP/OH-R0042.mp4",
      videoName: "Oscar_Launch_HT.mp4"
    }
  ];

  let indiceCliente = 0;
  let isTransitioning = false;

  const cId = document.getElementById('c-id');
  const cNombre = document.getElementById('c-nombre');
  const cRol = document.getElementById('c-rol');
  const cTexto = document.getElementById('c-texto');
  const cKpi1 = document.getElementById('c-kpi1');
  const cKpi2 = document.getElementById('c-kpi2');
  const cVideoName = document.getElementById('c-video-name');
  const storyContainer = document.getElementById('story-indicators');
  const cVideoLoader = document.getElementById('c-video-loader');

  // Construir pips de historia
  if (storyContainer) {
    clientesData.forEach((_, i) => {
      const pip = document.createElement('div');
      pip.className = 'story-pip';
      const fill = document.createElement('div');
      fill.className = 'story-pip-fill';
      fill.id = 'story-fill-' + i;
      pip.appendChild(fill);
      
      pip.addEventListener('click', () => {
        if (!isTransitioning && i !== indiceCliente) cambiarCliente(i);
      });
      storyContainer.appendChild(pip);
    });
  }

  // Prevenir que el EventListener de canplay se stackee múltiples veces
  let canPlayHandler = null;

  function cambiarCliente(index) {
    if (isTransitioning) return;
    isTransitioning = true;

    if (index < 0) index = clientesData.length - 1;
    if (index >= clientesData.length) index = 0;
    indiceCliente = index;
    
    const data = clientesData[indiceCliente];
    const textosAnimados = [cFoto, cNombre, cRol, cTexto, cKpi1, cKpi2, cVideoName];
    
    // Fade out textos y video
    textosAnimados.forEach(el => el.style.opacity = '0');
    cVideo.style.opacity = '0';
    
    // Mostrar loader visual
    if (cVideoLoader) cVideoLoader.classList.add('cargando');

    // Remover listener previo si el usuario hace much clicks rapidos
    if (canPlayHandler) {
      cVideo.removeEventListener('canplay', canPlayHandler);
    }

    setTimeout(() => {
      // Inyectar datos textuales
      cFoto.src = data.foto;
      cId.textContent = data.id;
      cNombre.textContent = data.nombre;
      cRol.textContent = data.rol;
      cTexto.textContent = data.texto;
      cKpi1.textContent = data.kpi1;
      cKpi2.textContent = data.kpi2;
      cVideoName.textContent = data.videoName;
      
      // Cambiar src del video
      cVideo.src = data.videoSrc;
      cVideo.load(); // forzar recarga

      // Resetear estado de los story pips
      clientesData.forEach((_, i) => {
        const fill = document.getElementById('story-fill-' + i);
        if (!fill) return;
        if (i < indiceCliente) fill.style.width = '100%'; // Los pasados llenos
        else if (i > indiceCliente) fill.style.width = '0%'; // Los futuros vacios
        else fill.style.width = '0%'; // El actual se empezara a llenar
      });

      // Recalcular reflow visual
      void cVideo.offsetWidth;

      // Fade In textos inmediantame
      textosAnimados.forEach(el => {
        el.style.transition = 'opacity 0.4s ease'; 
        el.style.opacity = '1';
      });

      // Armar la lógica de que el video solo haga Fade-in cuando esté listo
      canPlayHandler = () => {
        if (cVideoLoader) cVideoLoader.classList.remove('cargando');
        cVideo.style.opacity = '1';
        cVideo.play().catch(e => console.log('Autoplay:', e));
        
        // Iniciar transición CSS de la barra de historia de 10 segundos
        const currentFill = document.getElementById('story-fill-' + indiceCliente);
        if (currentFill) {
          currentFill.style.transition = 'none';
          currentFill.style.width = '0%';
          setTimeout(() => {
            currentFill.style.transition = 'width 10s linear';
            currentFill.style.width = '100%';
          }, 50); // micro delay para reflow
        }

        // Configurar timer estricto de 10 segundos para el siguiente cliente
        if(window.clienteTimer) clearTimeout(window.clienteTimer);
        window.clienteTimer = setTimeout(() => {
          cambiarCliente(indiceCliente + 1);
        }, 10000); // 10s exactos
      };

      cVideo.addEventListener('canplay', canPlayHandler, { once: true });

      setTimeout(() => { isTransitioning = false; }, 400);
    }, 400); // Wait for fade out
  }

  // Iniciar la rotación automática con el primer index

  // Iniciar la rotación automática con el primer index
  setTimeout(() => cambiarCliente(0), 500); 
}

// ─── SCROLLJACKING SYSTEM ──────────────────────────────
function initScrollJacking() {
  const wrapper = document.getElementById('secciones-wrapper');
  if (!wrapper) return;
  const secciones = document.querySelectorAll('.seccion');
  let currentSec = 0;
  let isScrolling = false;
  const cooldown = 1250; 

  // Función pura para obtener X, Y reales sin que el css transform en progreso corrompa los valores
  function getAbsoluteOffset(el) {
    let top = 0, left = 0;
    while(el) {
      top += el.offsetTop;
      left += el.offsetLeft;
      el = el.offsetParent;  
    }
    return { top, left };
  }

  let isInitialLoad = true;

  function getSyncPillPos() {
    const actionBar = document.getElementById('global-action-bar');
    const spacer = document.getElementById('action-bar-spacer');
    // Alineamos a la tarjeta exactamente (su padding / margin)
    const cardTarget = document.querySelector('.cliente-desc-card');
    
    if (!actionBar || !spacer || !cardTarget) return;

    if (currentSec === 0) {
      // Estado Hero
      const sPos = getAbsoluteOffset(spacer);
      const sRect = spacer.getBoundingClientRect();
      actionBar.style.transform = `translate(${sRect.left}px, ${sPos.top}px) scale(1)`;
      actionBar.style.width = spacer.offsetWidth + 'px';
      actionBar.classList.remove('mode-top');
    } else if (currentSec === 1) {
      // Estado VIP: centrado debajo del video del cliente
      const videoTarget = document.querySelector('.cliente-col-v');
      if (videoTarget) {
        actionBar.classList.add('mode-top');
        const vPos = getAbsoluteOffset(videoTarget);
        const vRect = videoTarget.getBoundingClientRect();
        const targetViewportTop = vPos.top - (window.innerHeight * currentSec);
        const ty = targetViewportTop + videoTarget.offsetHeight + 24;
        const tx = vRect.left + (videoTarget.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 2) {
      // Estado Portafolio: centrado debajo del visor de video principal
      const visorTarget = document.querySelector('.portafolio-visor-frame');
      if (visorTarget) {
        actionBar.classList.add('mode-top');
        const vPos = getAbsoluteOffset(visorTarget);
        const vRect = visorTarget.getBoundingClientRect();
        const targetViewportTop = vPos.top - (window.innerHeight * currentSec);
        const ty = targetViewportTop + visorTarget.offsetHeight + 24;
        const tx = vRect.left + (visorTarget.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 3) {
      // Estado Sobre Mí: alineado al panel de specs
      const infoTarget = document.querySelector('.sobremi-specs');
      if (infoTarget) {
        actionBar.classList.add('mode-top');
        const iPos = getAbsoluteOffset(infoTarget);
        const iRect = infoTarget.getBoundingClientRect();
        const targetViewportTop = iPos.top - (window.innerHeight * currentSec);
        const ty = targetViewportTop + infoTarget.offsetHeight + 30;
        const tx = iRect.left;
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 4) {
      // Estado CTA FINAL: centro enorme
      const ctaSpacer = document.getElementById('cta-button-spacer');
      if (ctaSpacer) {
        actionBar.classList.remove('mode-top');
        const cPos = getAbsoluteOffset(ctaSpacer);
        const cRect = ctaSpacer.getBoundingClientRect();
        const targetViewportTop = cPos.top - (window.innerHeight * currentSec);
        const tx = cRect.left + (ctaSpacer.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        const ty = targetViewportTop;
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1.4)`;
      }
    }

    // Prevenir que vuele de arriba hacia abajo en la primerísima carga
    if (isInitialLoad) {
      actionBar.style.transition = 'none';
      setTimeout(() => {
        actionBar.style.transition = 'transform 1200ms cubic-bezier(0.77, 0, 0.175, 1), background 1200ms';
        isInitialLoad = false;
      }, 50);
    }
  }

  function scrollToSec() {
    isScrolling = true;
    wrapper.style.transform = `translateY(-${currentSec * 100}dvh)`;
    
    // Al ejecutar translate, actualizamos el action bar al mismo tiempo
    getSyncPillPos();

    setTimeout(() => { isScrolling = false; }, cooldown);
  }

  // Refrescar al redimensionar y al iniciar para el layout correcto en cualquier pantalla
  window.addEventListener('resize', getSyncPillPos);
  // Pequeño timeout al arrancar para asegurar que dom pintó las coordenadas flex
  setTimeout(getSyncPillPos, 100);

  // Wheel Desktop/Mac
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;

    if (e.deltaY > 10) {
      // Hacia abajo
      if (currentSec < secciones.length - 1) {
        currentSec++;
        scrollToSec();
      }
    } else if (e.deltaY < -10) {
      // Hacia arriba
      if (currentSec > 0) {
        currentSec--;
        scrollToSec();
      }
    }
  }, { passive: false });

  // Touch Swipe Mobile
  let touchStartY = 0;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  });
  window.addEventListener('touchmove', e => {
    if (isScrolling) { e.preventDefault(); return; }
    let touchEndY = e.touches[0].clientY;
    let diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) < 30) return; // Umbral táctil

    if (diff > 0 && currentSec < secciones.length - 1) {
      currentSec++; scrollToSec();
    } else if (diff < 0 && currentSec > 0) {
      currentSec--; scrollToSec();
    }
  }, { passive: false });
}

// ─── SECCIÓN PORTAFOLIO SHOWCASE ──────────────────────────
function initPortafolioShowcase() {
  const contenedor = document.getElementById('portafolio-carrusel');
  const visorVideo = document.getElementById('portafolio-video-principal');
  const visorTitulo = document.getElementById('portafolio-titulo-activo');
  const visorCategoria = document.getElementById('portafolio-categoria-activa');
  const visorStats = document.getElementById('portafolio-stats-activos');

  if (!contenedor || !visorVideo) return;

  const piezas = [
    {
      titulo: 'AD #1 — Producto Digital',
      categoria: 'PAID ADS · META',
      stats: '+2.4M Impresiones · CTR 4.8%',
      src: 'videos /AD %231.mp4',
      color: '#c0392b'
    },
    {
      titulo: 'AD #6 — Hook Variation',
      categoria: 'PAID ADS · TikTok',
      stats: '+1.8M Views · 8.3% Conv.',
      src: 'videos /AD %236 Hook %233.mp4',
      color: '#2980b9'
    },
    {
      titulo: 'DA-R015 — Orgánico',
      categoria: 'CONTENIDO ORGÁNICO · IG',
      stats: '+3.1M Alcance · 9.2% ER',
      src: 'videos /DA-R015.mp4',
      color: '#8e44ad'
    },
    {
      titulo: 'Orgánico #12 — Storytelling',
      categoria: 'CONTENIDO ORGÁNICO · TikTok',
      stats: '+5.7M Views · Viral',
      src: 'videos /Organico %2312.mp4',
      color: '#16a085'
    },
    {
      titulo: 'Reel 3 — Ranger 570',
      categoria: 'BRAND CONTENT · IG Reels',
      stats: '+890K Views · 6.1% ER',
      src: 'videos /Reel 3- ranger 570.mp4',
      color: '#d35400'
    },
    {
      titulo: 'Doble Ranger — Acción',
      categoria: 'BRAND CONTENT · YouTube Shorts',
      stats: '+1.2M Views · Trending #3',
      src: 'videos /doble Ranger.mp4',
      color: '#27ae60'
    },
    {
      titulo: 'David Otálora Viral v2',
      categoria: 'VIP CLIENT · RETENCIÓN',
      stats: '+13M Views',
      src: 'ClientesVIP/Plan de contenido.mp4',
      color: '#f39c12'
    },
    {
      titulo: 'Marcos Razzetti E-com',
      categoria: 'VIP CLIENT · TIKTOK',
      stats: '+35M Views',
      src: 'ClientesVIP/Marcos %233.mp4',
      color: '#34495e'
    },
    {
      titulo: 'Oscar Hinojosa Launch',
      categoria: 'VIP CLIENT · REELS',
      stats: '+$1M Reven.',
      src: 'ClientesVIP/OH-R0042.mp4',
      color: '#d1ccc0'
    }
  ];

  let indiceActivo = 0;
  let enTransicion = false;

  // Crear tarjetas del carrusel
  piezas.forEach((pieza, i) => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'portafolio-tarjeta' + (i === 0 ? ' activa' : '');
    tarjeta.dataset.index = i;
    tarjeta.style.setProperty('--color-acento', pieza.color);

    const videoThumb = document.createElement('video');
    videoThumb.src = pieza.src + '#t=0.1'; // Optimización: Cargar solo el primer frame
    videoThumb.muted = true;
    videoThumb.playsInline = true;
    videoThumb.preload = 'metadata'; // Optimización: No precargar 9 videos enteros
    videoThumb.className = 'portafolio-thumb';

    const overlay = document.createElement('div');
    overlay.className = 'portafolio-overlay';
    overlay.innerHTML = `
      <span class="portafolio-categoria-chip">${pieza.categoria}</span>
      <span class="portafolio-titulo-chip">${pieza.titulo.split('—')[0].trim()}</span>
    `;

    const num = document.createElement('span');
    num.className = 'portafolio-num';
    num.textContent = String(i + 1).padStart(2, '0');

    tarjeta.appendChild(videoThumb);
    tarjeta.appendChild(overlay);
    tarjeta.appendChild(num);
    contenedor.appendChild(tarjeta);

    // Seleccionar pieza (al remover hover-reproducción, se ahorra gran cantidad de recursos)
    tarjeta.addEventListener('click', () => seleccionarPieza(i));
  });

  // Funcionalidad de Play/Pause estilo TikTok / Instagram al dar clic en el video principal
  if (visorVideo) {
    visorVideo.addEventListener('click', () => {
      if (visorVideo.paused) {
        visorVideo.play().catch(() => {});
        visorVideo.parentElement.classList.remove('pausado');
      } else {
        visorVideo.pause();
        visorVideo.parentElement.classList.add('pausado');
      }
    });

    // Controlar fin de carga
    visorVideo.addEventListener('playing', () => {
      visorVideo.parentElement.classList.remove('pausado');
    });
  }

  function seleccionarPieza(idx) {
    if (enTransicion || idx === indiceActivo) return;
    enTransicion = true;

    // Quitar activa de tarjeta anterior
    const tarjetaAnterior = contenedor.querySelector('.portafolio-tarjeta.activa');
    if (tarjetaAnterior) tarjetaAnterior.classList.remove('activa');

    indiceActivo = idx;
    const pieza = piezas[idx];

    // Activar tarjeta nueva
    const tarjetaNueva = contenedor.querySelector(`[data-index="${idx}"]`);
    if (tarjetaNueva) tarjetaNueva.classList.add('activa');

    // Fade out visor
    if (visorVideo) { visorVideo.style.opacity = '0'; }
    if (visorTitulo) { visorTitulo.style.opacity = '0'; }
    if (visorCategoria) { visorCategoria.style.opacity = '0'; }
    if (visorStats) { visorStats.style.opacity = '0'; }

    setTimeout(() => {
      // Cambiar video del visor
      if (visorVideo) {
        visorVideo.src = pieza.src;
        visorVideo.load();
        visorVideo.muted = false; // Desmutear al hacer clic (permitido por política web porque hubo clic)
        visorVideo.play().catch(() => {});
        visorVideo.style.opacity = '1';
      }
      if (visorTitulo) { visorTitulo.textContent = pieza.titulo; visorTitulo.style.opacity = '1'; }
      if (visorCategoria) { visorCategoria.textContent = pieza.categoria; visorCategoria.style.opacity = '1'; }
      if (visorStats) { visorStats.textContent = pieza.stats; visorStats.style.opacity = '1'; }

      enTransicion = false;
    }, 350);
  }

  // Inicializar visor con la primera pieza
  if (visorVideo) {
    visorVideo.src = piezas[0].src;
    visorVideo.play().catch(() => {});
  }
  if (visorTitulo) visorTitulo.textContent = piezas[0].titulo;
  if (visorCategoria) visorCategoria.textContent = piezas[0].categoria;
  if (visorStats) visorStats.textContent = piezas[0].stats;
}

// Llama al init también en DOMContentLoaded general
document.addEventListener('DOMContentLoaded', () => {
  initClientesSection();
  initPortafolioShowcase();
  initScrollJacking();
});
