// ═══════════════════════════════════════════════════════
//  main.js — Portafolio Editor de Video
// ═══════════════════════════════════════════════════════

const VIDEOS = [
  'videos /Marcos #3.mp4',
  'videos /OH-R0042.mp4',
  'videos /Plan de contenido.mp4',
  'videos /Reel 3- ranger 570.mp4',
  'videos /doble Ranger.mp4',
];

// Intervalo entre cambio de videos (ms)
const INTERVALO_VIDEO = 7000;

document.addEventListener('DOMContentLoaded', () => {
  iniciarCursor();
  iniciarParticulas();
  iniciarTypewriter();
  generarMarcasTimeline();
  generarWaveformAudio();
  iniciarReproductor();
});

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
      foto: "ClientesVIP/David Otalora.jpeg",
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
      foto: "ClientesVIP/marcos-razzetti.jpeg",
      videoSrc: "ClientesVIP/Marcos #3.mp4",
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
  const cProgressFill = document.getElementById('c-progress-fill');
  const cNavPips = document.getElementById('c-nav-pips');
  const btnPrevC = document.getElementById('btn-prev-c');
  const btnNextC = document.getElementById('btn-next-c');
  const cVideoLoader = document.getElementById('c-video-loader');

  // Construir dots (pips)
  if (cNavPips) {
    clientesData.forEach((_, i) => {
      const pip = document.createElement('div');
      pip.className = 'c-pip' + (i === 0 ? ' activo' : '');
      pip.addEventListener('click', () => {
        if (!isTransitioning && i !== indiceCliente) cambiarCliente(i);
      });
      cNavPips.appendChild(pip);
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

      // Actualizar Nav Pips
      document.querySelectorAll('.c-pip').forEach((pip, i) => {
        pip.className = 'c-pip' + (i === indiceCliente ? ' activo' : '');
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
      };

      cVideo.addEventListener('canplay', canPlayHandler, { once: true });

      setTimeout(() => { isTransitioning = false; }, 400);
    }, 400); // Wait for fade out
  }

  // Bind Buttons
  if (btnPrevC) btnPrevC.addEventListener('click', () => cambiarCliente(indiceCliente - 1));
  if (btnNextC) btnNextC.addEventListener('click', () => cambiarCliente(indiceCliente + 1));

  // Sync Video bar
  if (cVideo) {
    cVideo.addEventListener('timeupdate', () => {
      if (cVideo.duration) {
        cProgressFill.style.width = ((cVideo.currentTime / cVideo.duration) * 100) + '%';
      }
    });

    // Cambiar dinámicamente al próximo cuando acaba el actual (Efecto presentación fluida)
    cVideo.addEventListener('ended', () => {
      cambiarCliente(indiceCliente + 1);
    });
  }
}

// Llama al init también en DOMContentLoaded general (ya que este script no estaba modularizado asincrónico por partes)
document.addEventListener('DOMContentLoaded', () => {
  initClientesSection();
});
