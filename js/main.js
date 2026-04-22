// ═══════════════════════════════════════════════════════
//  main.js — Portafolio Editor de Video
// ═══════════════════════════════════════════════════════

// Detectar soporte WebM una sola vez (mucho más liviano que MP4)
const soportaWebM = (() => {
  const v = document.createElement('video');
  return v.canPlayType('video/webm; codecs="vp9"') !== '';
})();

// Par de fuentes por video — webm primero, mp4 como fallback
const VIDEOS_FUENTES = [
  { webm: 'videos /AD 1.webm',             mp4: 'videos /AD %231.mp4' },
  { webm: 'videos /AD-_6-Hook-_3.webm',    mp4: 'videos /AD %236 Hook %233.mp4' },
  { webm: 'videos /DA-R015.webm',          mp4: 'videos /DA-R015.mp4' },
  { webm: 'videos /Organico 12.webm',      mp4: 'videos /Organico %2312.mp4' },
  { webm: 'videos /Reel-3-ranger-570.webm',mp4: 'videos /Reel 3- ranger 570.mp4' },
  { webm: 'videos /doble Ranger.webm',     mp4: 'videos /doble Ranger.mp4' },
];

// Devuelve la mejor fuente disponible para el navegador
function eligirFuente(par) {
  if (!par) return '';
  return soportaWebM && par.webm ? par.webm : par.mp4;
}

// Array de strings listo para usar
const VIDEOS = VIDEOS_FUENTES.map(eligirFuente);

const INTERVALO_VIDEO = 5000;

// Detectar dispositivo táctil una vez y reutilizar
const esTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

document.addEventListener('DOMContentLoaded', () => {
  initCarga();
  if (!esTactil) iniciarCursor();
  iniciarTypewriter();
  generarMarcasTimeline();
  generarWaveformAudio();
  iniciarReproductor();
  if (!esTactil) iniciarParallaxCards();
  initClientesSection();
  initPortafolioShowcase();
  initScrollJacking();
  iniciarParticulas();
});

// ─── PANTALLA DE CARGA ─────────────────────────────────
function initCarga() {
  const loader = document.getElementById('pantalla-carga');
  const barra  = document.getElementById('carga-progreso');
  const texto  = document.getElementById('carga-texto');
  if (!loader) return;

  let progreso = 0;
  const intervalo = setInterval(() => {
    progreso += Math.random() * 8;
    if (progreso > 90) progreso = 90;
    if (barra) barra.style.width = progreso + '%';
    if (texto) texto.textContent = `PRECARGANDO MEDIA... ${Math.floor(progreso)}%`;
  }, 80);

  function finalizarCarga() {
    clearInterval(intervalo);
    if (barra) barra.style.width = '100%';
    if (texto) texto.textContent = 'SISTEMA LISTO · 100%';
    setTimeout(() => { loader.classList.add('oculta'); }, 600);
  }

  const assetsCargados = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });

  const videoCargado = new Promise(resolve => {
    const video = document.getElementById('video-a');
    if (!video) return resolve();
    if (video.readyState >= 3) resolve();
    else video.addEventListener('loadedmetadata', resolve, { once: true });
    setTimeout(resolve, 3000);
  });

  Promise.all([assetsCargados, videoCargado]).then(finalizarCarga);
}

// ─── Parallax solo en desktop ─────────────────────────
function iniciarParallaxCards() {
  const cardsIzq = document.getElementById('panel-izquierdo');
  const cardsDer = document.getElementById('cards-der');
  const visor    = document.getElementById('video-wrap');
  if (!cardsIzq || !cardsDer || !visor) return;

  document.addEventListener('mousemove', (e) => {
    const inicio = document.getElementById('inicio');
    if (!inicio || inicio.getBoundingClientRect().bottom <= 0) return;
    const x = (window.innerWidth  / 2 - e.clientX) / 80;
    const y = (window.innerHeight / 2 - e.clientY) / 80;
    cardsIzq.style.transform = `translate(${x * 0.8}px, ${y * 0.8}px)`;
    cardsDer.style.transform = `translate(${x * 1.2}px, ${y * 1.2}px)`;
    visor.style.transform    = `translate(${x * -0.3}px, ${y * -0.3}px)`;
  });
}

const MINIATURAS_VIDEOS = [
  { nombre: 'AD #1',        duracion: '0:30' },
  { nombre: 'AD #6 Hook #3', duracion: '0:28' },
  { nombre: 'DA-R015',      duracion: '0:45' },
  { nombre: 'Organico #12', duracion: '1:12' },
  { nombre: 'Reel 3 Ranger', duracion: '0:22' },
  { nombre: 'Doble Ranger', duracion: '0:35' },
];

// ─── Reproductor con crossfade ─────────────────────────
function iniciarReproductor() {
  const videoA    = document.getElementById('video-a');
  const videoB    = document.getElementById('video-b');
  const canvas    = document.getElementById('canvas-color');
  const ctx       = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  const miniaturas       = document.querySelectorAll('.miniatura');
  const progresoFill     = document.getElementById('progreso-fill');
  const tiempoEl         = document.getElementById('video-tiempo');
  const timelineCabezal  = document.getElementById('timeline-cabezal');
  const tlTimecode       = document.getElementById('tl-timecode');
  const proyectoProgresoFill = document.getElementById('proyecto-progreso-fill');
  const proyectoDuracion = document.getElementById('proyecto-duracion');
  const proyectoNombre   = document.getElementById('proyecto-nombre');

  if (!videoA || !videoB) return;

  let indiceActual = 0;
  let videoActivo  = videoA;
  let videoOculto  = videoB;
  let intervalo;
  let colorSamplerInterval;

  videoActivo.src = VIDEOS[0];
  videoActivo.load();
  videoActivo.play().catch(() => {});

  // Pausar video hero si no está en pantalla (ahorra CPU/batería)
  const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        videoActivo.pause();
        videoOculto.pause();
        clearInterval(intervalo);
      } else {
        videoActivo.play().catch(() => {});
        reiniciarIntervalo();
      }
    });
  }, { threshold: 0.1 });
  heroObserver.observe(document.getElementById('inicio'));

  function cambiarA(indice) {
    if (indice === indiceActual) return;
    indiceActual = indice;

    if (proyectoNombre) {
      const parts = VIDEOS[indice].split('/');
      proyectoNombre.textContent = parts[parts.length - 1];
    }

    document.querySelectorAll('.pista-clip').forEach(clip => {
      clip.style.left  = Math.floor(Math.random() * 60) + '%';
      clip.style.width = Math.floor(Math.random() * 30 + 10) + '%';
    });

    videoOculto.src = VIDEOS[indice];
    videoOculto.load();
    videoOculto.currentTime = 0;

    videoOculto.play().then(() => {
      videoOculto.classList.add('activa');
      videoActivo.classList.remove('activa');
      const temp = videoActivo;
      videoActivo = videoOculto;
      videoOculto = temp;
      miniaturas.forEach((m, i) => m.classList.toggle('activa', i === indiceActual));
      reiniciarIntervalo();
    }).catch(() => {});
  }

  function siguiente() {
    cambiarA((indiceActual + 1) % VIDEOS.length);
  }

  function reiniciarIntervalo() {
    clearInterval(intervalo);
    intervalo = setInterval(siguiente, INTERVALO_VIDEO);
  }
  reiniciarIntervalo();

  miniaturas.forEach(btn => {
    btn.addEventListener('click', () => cambiarA(parseInt(btn.dataset.index)));
  });

  // Loop RAF para progreso — solo cuando la pestaña y la sección están visibles
  function actualizarProgreso() {
    if (!document.hidden && videoActivo && videoActivo.duration && !videoActivo.paused) {
      const inicio = document.getElementById('inicio');
      const visible = inicio && inicio.getBoundingClientRect().bottom > 0;
      if (visible) {
        const pct = (videoActivo.currentTime / videoActivo.duration) * 100;
        if (progresoFill) progresoFill.style.width = pct + '%';
        if (proyectoProgresoFill) proyectoProgresoFill.style.width = pct + '%';
        if (timelineCabezal) timelineCabezal.style.left = pct + '%';
        const seg    = Math.floor(videoActivo.currentTime);
        const mm     = String(Math.floor(seg / 60)).padStart(2, '0');
        const ss     = String(seg % 60).padStart(2, '0');
        const frames = String(Math.floor((videoActivo.currentTime % 1) * 60)).padStart(2, '0');
        if (tiempoEl) tiempoEl.textContent = `00:${mm}:${ss}`;
        if (proyectoDuracion) proyectoDuracion.textContent = `${mm}:${ss}`;
        if (tlTimecode) tlTimecode.textContent = `00:${mm}:${ss}:${frames}`;
      }
    }
    window.requestAnimationFrame(actualizarProgreso);
  }
  window.requestAnimationFrame(actualizarProgreso);

  // ── Color sampler con fallback ──
  const fallbackColors = [
    {r:120, g:100, b:85},
    {r:90,  g:110, b:120},
    {r:130, g:125, b:110},
    {r:100, g:130, b:105},
    {r:140, g:110, b:90},
  ];

  function extraerColorDominante() {
    if (!ctx || !videoActivo || videoActivo.readyState < 2) return null;
    try {
      ctx.drawImage(videoActivo, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 32) {
        r += data[i]; g += data[i+1]; b += data[i+2]; count++;
      }
      return count === 0 ? null : { r: Math.round(r/count), g: Math.round(g/count), b: Math.round(b/count) };
    } catch { return null; }
  }

  function desaturar(r, g, b, factor = 0.12) {
    return {
      r: Math.round(255 + (r - 255) * factor),
      g: Math.round(255 + (g - 255) * factor),
      b: Math.round(255 + (b - 255) * factor),
    };
  }

  function aplicarColorACards(color) {
    if (!color) return;
    const c      = desaturar(color.r, color.g, color.b, 0.28);
    const fondo  = `rgba(${c.r}, ${c.g}, ${c.b}, 0.65)`;
    const borde  = `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`;
    document.querySelectorAll('.card').forEach(card => {
      card.style.background  = fondo;
      card.style.borderColor = borde;
    });
    const visor = document.querySelector('.visor-central');
    if (visor) {
      const cv = desaturar(color.r, color.g, color.b, 0.12);
      visor.style.backgroundColor = `rgb(${cv.r}, ${cv.g}, ${cv.b})`;
    }
    const cClip  = desaturar(color.r, color.g, color.b, 0.45);
    const cAudio = desaturar(color.r, color.g, color.b, 0.35);
    document.querySelectorAll('.clip-v1').forEach(el => el.style.background = `rgba(${cClip.r},${cClip.g},${cClip.b},0.65)`);
    document.querySelectorAll('.clip-v2').forEach(el => el.style.background = `rgba(${cClip.r},${cClip.g},${cClip.b},0.55)`);
    document.querySelectorAll('.wave-bar').forEach(el => el.style.background = `rgba(${cAudio.r},${cAudio.g},${cAudio.b},0.55)`);
  }

  // Solo samplear en desktop — ahorra CPU en mobile
  if (!esTactil) {
    colorSamplerInterval = setInterval(() => {
      if (document.hidden || videoActivo.paused) return;
      const inicio   = document.getElementById('inicio');
      const visible  = inicio && inicio.getBoundingClientRect().bottom > 0;
      if (!visible) return;
      let color = extraerColorDominante();
      if (!color) color = fallbackColors[indiceActual];
      aplicarColorACards(color);
    }, 2500);
  } else {
    // En mobile usar solo colores fallback estáticos
    aplicarColorACards(fallbackColors[0]);
  }

  videoActivo.addEventListener('loadeddata', () => {
    let color = extraerColorDominante();
    if (!color) color = fallbackColors[indiceActual];
    aplicarColorACards(color);
  });

  setTimeout(() => {
    let color = extraerColorDominante();
    if (!color) color = fallbackColors[indiceActual];
    aplicarColorACards(color);
  }, 100);
}

// ─── Generación de Waveform (Audio) ───────────────────
function generarWaveformAudio() {
  const contenedor = document.getElementById('carril-audio');
  if (!contenedor) return;
  for (let i = 0; i < 120; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.setProperty('--dur', (0.4 + Math.random() * 0.8) + 's');
    bar.style.setProperty('--delay', (Math.random() * -2) + 's');
    contenedor.appendChild(bar);
  }
}

// ─── Marcas de la regla del timeline ──────────────────
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

// ─── Cursor personalizado (solo desktop) ──────────────
function iniciarCursor() {
  const punto  = document.getElementById('cursor-punto');
  const anillo = document.getElementById('cursor-anillo');
  if (!punto || !anillo) return;

  let rX = 0, rY = 0, pX = 0, pY = 0;

  document.addEventListener('mousemove', (e) => {
    pX = e.clientX; pY = e.clientY;
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
      punto.style.width = punto.style.height = '3px';
      anillo.style.width = anillo.style.height = '46px';
      anillo.style.opacity = '0.6';
    });
    el.addEventListener('mouseleave', () => {
      punto.style.width = punto.style.height = '6px';
      anillo.style.width = anillo.style.height = '28px';
      anillo.style.opacity = '1';
    });
  });
}

// ─── Partículas de fondo — solo desktop ───────────────
function iniciarParticulas() {
  const canvas = document.getElementById('canvas-particulas');
  if (!canvas) return;

  // En mobile no dibujar partículas para ahorrar batería
  if (esTactil) return;

  const ctx = canvas.getContext('2d');
  let particulas = [];
  const CANTIDAD = 40;

  function redimensionar() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function crearParticula() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
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
    if (document.hidden) { requestAnimationFrame(dibujar); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particulas.forEach(p => {
      p.x += p.vx; p.y += p.vy;
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
          ctx.beginPath();
          ctx.moveTo(particulas[i].x, particulas[i].y);
          ctx.lineTo(particulas[j].x, particulas[j].y);
          ctx.strokeStyle = `rgba(44, 42, 37, ${(1 - dist / 90) * 0.03})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(dibujar);
  }

  inicializar();
  dibujar();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redimensionar, 100);
  });
}

// ─── Typewriter ────────────────────────────────────────
function iniciarTypewriter() {
  const el = document.getElementById('tagline-texto');
  if (!el) return;

  const textos = ['Short Content', 'High Retention', 'Vertical Video'];
  let idxTexto = 0, idxChar = 0, borrando = false, pausando = false;

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

// ─── LÓGICA DE SECCIÓN CLIENTES ────────────────────────
function initClientesSection() {
  const cVideo = document.getElementById('c-video');
  const cFoto  = document.getElementById('c-foto');
  if (!cVideo || !cFoto) return;

  const clientesData = [
    {
      id: 'ID-01', nombre: 'David Otálora', rol: 'E-COMMERCE & VIRALIDAD',
      texto: 'Estrategias de viralización orgánica y crecimiento exponencial de comunidades. Enfoque en la retención absoluta del espectador mediante storytelling dinámico, ritmo acelerado y ganchos emocionales para escalar ventas.',
      kpi1: '+13M Views', kpi2: 'Reel 9:16',
      foto: 'ClientesVIP/David Otalora.jpg',
      videoSrc: eligirFuente({ webm: 'ClientesVIP/Plan de contenido.webm', mp4: 'ClientesVIP/Plan de contenido.mp4' }),
      videoName: 'David_Otalora_Viral_v2.mp4'
    },
    {
      id: 'ID-02', nombre: 'Marcos Razzetti', rol: 'EMPRENDEDOR & E-COMMERCE',
      texto: 'Modelos de negocio de e-commerce a escala global y funnels de conversión avanzados. Optimización de rentabilidad máxima mediante estrategias de marketing automatizadas y logística eficiente.',
      kpi1: '+35M Views', kpi2: 'TikTok 9:16',
      foto: 'ClientesVIP/marcos-razzetti.jpg',
      videoSrc: eligirFuente({ webm: 'ClientesVIP/Marcos 3.webm', mp4: 'ClientesVIP/Marcos 3.mp4' }),
      videoName: 'MR_Ecom_Scale_1080p.mp4'
    },
    {
      id: 'ID-03', nombre: 'Oscar Hinojosa', rol: 'MARKETING DIGITAL',
      texto: 'Estrategias de posicionamiento y lanzamientos digitales de alta conversión. Experto en captación de clientes, storytelling y ventas high-ticket, transformando influencia en negocios escalables.',
      kpi1: '+$1M Reven.', kpi2: 'Reel 9:16',
      foto: 'ClientesVIP/Oscar hinojosa.jpg',
      videoSrc: eligirFuente({ webm: 'ClientesVIP/OH-R0042.webm', mp4: 'ClientesVIP/OH-R0042.mp4' }),
      videoName: 'Oscar_Launch_HT.mp4'
    }
  ];

  let indiceCliente = 0;
  let isTransitioning = false;

  const cId         = document.getElementById('c-id');
  const cNombre     = document.getElementById('c-nombre');
  const cRol        = document.getElementById('c-rol');
  const cTexto      = document.getElementById('c-texto');
  const cKpi1       = document.getElementById('c-kpi1');
  const cKpi2       = document.getElementById('c-kpi2');
  const cVideoName  = document.getElementById('c-video-name');
  const storyContainer = document.getElementById('story-indicators');
  const cVideoLoader   = document.getElementById('c-video-loader');

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

  let canPlayHandler = null;

  function cambiarCliente(index) {
    if (isTransitioning) return;
    isTransitioning = true;

    if (index < 0) index = clientesData.length - 1;
    if (index >= clientesData.length) index = 0;
    indiceCliente = index;

    const data = clientesData[indiceCliente];
    const textosAnimados = [cFoto, cNombre, cRol, cTexto, cKpi1, cKpi2, cVideoName];

    textosAnimados.forEach(el => el && (el.style.opacity = '0'));
    cVideo.style.opacity = '0';
    if (cVideoLoader) cVideoLoader.classList.add('cargando');

    if (canPlayHandler) cVideo.removeEventListener('canplay', canPlayHandler);

    setTimeout(() => {
      cFoto.src = data.foto;
      if (cId)        cId.textContent        = data.id;
      if (cNombre)    cNombre.textContent    = data.nombre;
      if (cRol)       cRol.textContent       = data.rol;
      if (cTexto)     cTexto.textContent     = data.texto;
      if (cKpi1)      cKpi1.textContent      = data.kpi1;
      if (cKpi2)      cKpi2.textContent      = data.kpi2;
      if (cVideoName) cVideoName.textContent = data.videoName;

      // Lazy: asignar src solo al momento de usar
      cVideo.src = data.videoSrc;
      cVideo.preload = 'metadata';
      cVideo.load();

      clientesData.forEach((_, i) => {
        const fill = document.getElementById('story-fill-' + i);
        if (!fill) return;
        fill.style.width = i < indiceCliente ? '100%' : '0%';
      });

      void cVideo.offsetWidth;

      textosAnimados.forEach(el => {
        if (!el) return;
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '1';
      });

      canPlayHandler = () => {
        if (cVideoLoader) cVideoLoader.classList.remove('cargando');
        cVideo.style.opacity = '1';
        cVideo.play().catch(() => {});

        const currentFill = document.getElementById('story-fill-' + indiceCliente);
        if (currentFill) {
          currentFill.style.transition = 'none';
          currentFill.style.width = '0%';
          setTimeout(() => {
            currentFill.style.transition = 'width 10s linear';
            currentFill.style.width = '100%';
          }, 50);
        }

        if (window.clienteTimer) clearTimeout(window.clienteTimer);
        window.clienteTimer = setTimeout(() => cambiarCliente(indiceCliente + 1), 10000);
      };

      cVideo.addEventListener('canplay', canPlayHandler, { once: true });

      // Pausar video del cliente si no es visible
      const vObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            cVideo.pause();
            if (window.clienteTimer) clearTimeout(window.clienteTimer);
          } else {
            if (cVideo.src) cVideo.play().catch(() => {});
          }
        });
      }, { threshold: 0.1 });
      vObserver.observe(cVideo);

      setTimeout(() => { isTransitioning = false; }, 400);
    }, 400);
  }

  // Diferir carga de la sección clientes hasta que el usuario llegue ahí
  const clienteObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        cambiarCliente(0);
        clienteObserver.disconnect();
      }
    });
  }, { threshold: 0.1 });

  const secClientes = document.getElementById('clientes');
  if (secClientes) clienteObserver.observe(secClientes);
}

// ─── SCROLLJACKING ─────────────────────────────────────
function initScrollJacking() {
  const wrapper = document.getElementById('secciones-wrapper');
  if (!wrapper) return;

  const secciones = document.querySelectorAll('.seccion');
  let currentSec  = 0;
  let isScrolling = false;
  const cooldown  = 1250;

  function getAbsoluteOffset(el) {
    let top = 0, left = 0;
    while (el) { top += el.offsetTop; left += el.offsetLeft; el = el.offsetParent; }
    return { top, left };
  }

  let isInitialLoad = true;

  // En mobile la píldora va fija abajo — CSS !important lo controla, no JS
  function getSyncPillPos() {
    const actionBar = document.getElementById('global-action-bar');
    if (!actionBar) return;

    // En mobile solo gestionamos las clases CSS (no el posicionamiento JS)
    if (esTactil) {
      actionBar.style.removeProperty('transform');
      actionBar.style.removeProperty('width');
      // Aplicar mode-single a partir de la sección 2 (portafolio, sobre mí, CTA)
      if (currentSec >= 2) {
        actionBar.classList.add('mode-single');
      } else {
        actionBar.classList.remove('mode-single');
      }
      return;
    }

    const spacer = document.getElementById('action-bar-spacer');
    if (!spacer) return;

    if (currentSec === 0) {
      actionBar.classList.remove('mode-top', 'mode-dark', 'mode-single');
      const sPos  = getAbsoluteOffset(spacer);
      const sRect = spacer.getBoundingClientRect();
      actionBar.style.transform = `translate(${sRect.left}px, ${sPos.top}px) scale(1)`;
      actionBar.style.width = spacer.offsetWidth + 'px';
    } else if (currentSec === 1) {
      const videoTarget = document.querySelector('.cliente-col-v');
      if (videoTarget) {
        actionBar.classList.remove('mode-dark', 'mode-single');
        actionBar.classList.add('mode-top');
        const vPos = getAbsoluteOffset(videoTarget);
        const vRect = videoTarget.getBoundingClientRect();
        const ty = vPos.top - (window.innerHeight * currentSec) + videoTarget.offsetHeight + 24;
        const tx = vRect.left + (videoTarget.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 2) {
      const visorTarget = document.querySelector('.portafolio-visor-frame');
      if (visorTarget) {
        actionBar.classList.remove('mode-top');
        actionBar.classList.add('mode-dark', 'mode-single');
        const vPos = getAbsoluteOffset(visorTarget);
        const vRect = visorTarget.getBoundingClientRect();
        const ty = vPos.top - (window.innerHeight * currentSec) + visorTarget.offsetHeight + 24;
        const tx = vRect.left + (visorTarget.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 3) {
      const infoTarget = document.querySelector('.sobremi-specs');
      if (infoTarget) {
        actionBar.classList.remove('mode-top');
        actionBar.classList.add('mode-dark', 'mode-single');
        const iPos = getAbsoluteOffset(infoTarget);
        const iRect = infoTarget.getBoundingClientRect();
        const ty = iPos.top - (window.innerHeight * currentSec) + infoTarget.offsetHeight + 30;
        const tx = iRect.left;
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      }
    } else if (currentSec === 4) {
      const ctaSpacer = document.getElementById('cta-button-spacer');
      if (ctaSpacer) {
        actionBar.classList.remove('mode-top', 'mode-dark');
        actionBar.classList.add('mode-single');
        const cPos  = getAbsoluteOffset(ctaSpacer);
        const cRect = ctaSpacer.getBoundingClientRect();
        const ty = cPos.top - (window.innerHeight * currentSec);
        const tx = cRect.left + (ctaSpacer.offsetWidth / 2) - (actionBar.offsetWidth / 2);
        actionBar.style.transform = `translate(${tx}px, ${ty}px) scale(1.4)`;
      }
    }

    if (isInitialLoad) {
      actionBar.style.transition = 'none';
      setTimeout(() => {
        actionBar.style.transition = 'transform 1200ms cubic-bezier(0.77, 0, 0.175, 1), background 1200ms';
        isInitialLoad = false;
      }, 50);
    }
  }

  function updateNavbarState() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    if (currentSec === 2 || currentSec === 4) navbar.classList.add('mode-dark');
    else navbar.classList.remove('mode-dark');

    document.querySelectorAll('#navbar .btn-barra').forEach(btn => {
      const target = parseInt(btn.getAttribute('data-target'));
      const activo = target === currentSec || (target === 2 && currentSec === 1);
      btn.classList.toggle('activo', activo);
    });
  }

  function scrollToSec() {
    isScrolling = true;
    // Usar unidad flexible: en mobile 100vh y en desktop 100dvh
    const unidad = esTactil ? window.innerHeight : window.innerHeight;
    wrapper.style.transform = `translateY(-${currentSec * unidad}px)`;
    getSyncPillPos();
    updateNavbarState();
    setTimeout(() => { isScrolling = false; }, cooldown);
  }

  // Clicks en navbar
  const navBtns = document.querySelectorAll('#navbar .btn-barra, #navbar .barra-logo');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetStr = e.currentTarget.getAttribute('data-target');
      if (targetStr !== null && !isScrolling) {
        currentSec = parseInt(targetStr);
        scrollToSec();
      }
    });
  });

  // Action bar — Contactar
  const btnContactar = document.getElementById('btn-contactar');
  if (btnContactar) {
    btnContactar.addEventListener('click', () => {
      window.open('https://wa.me/5493812019292', '_blank');
    });
  }

  // Action bar — Ver trabajos
  const btnVerTrabajos = document.getElementById('btn-ver-trabajo');
  if (btnVerTrabajos) {
    btnVerTrabajos.addEventListener('click', () => {
      if (!isScrolling) { currentSec = 2; scrollToSec(); }
    });
  }

  updateNavbarState();

  let pillResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(pillResizeTimer);
    pillResizeTimer = setTimeout(getSyncPillPos, 50);
  });
  setTimeout(getSyncPillPos, 100);

  // Wheel — desktop
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;
    if (e.deltaY > 10 && currentSec < secciones.length - 1) { currentSec++; scrollToSec(); }
    else if (e.deltaY < -10 && currentSec > 0) { currentSec--; scrollToSec(); }
  }, { passive: false });

  // Touch — mobile/tablet
  let touchStartY = 0;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (isScrolling) { e.preventDefault(); return; }
    const diff = touchStartY - e.touches[0].clientY;
    if (Math.abs(diff) < 40) return; // Umbral un poco mayor para mobile
    if (diff > 0 && currentSec < secciones.length - 1) { currentSec++; scrollToSec(); }
    else if (diff < 0 && currentSec > 0) { currentSec--; scrollToSec(); }
  }, { passive: false });
}

// ─── PORTAFOLIO SHOWCASE ───────────────────────────────
function initPortafolioShowcase() {
  const contenedor     = document.getElementById('portafolio-carrusel');
  const visorVideo     = document.getElementById('portafolio-video-principal');
  const visorTitulo    = document.getElementById('portafolio-titulo-activo');
  const visorCategoria = document.getElementById('portafolio-categoria-activa');
  const visorStats     = document.getElementById('portafolio-stats-activos');
  const btnMute        = document.getElementById('portafolio-btn-mute');
  const captionTitulo  = document.getElementById('portafolio-titulo-activo-m');
  const captionCat     = document.getElementById('portafolio-categoria-activa-m');

  if (!contenedor || !visorVideo) return;

  const piezas = [
    { titulo: 'AD #1 — Producto Digital',    categoria: 'PAID ADS · META',              stats: '+2.4M Impresiones · CTR 4.8%', src: eligirFuente(VIDEOS_FUENTES[0]),  color: '#c0392b' },
    { titulo: 'AD #6 — Hook Variation',      categoria: 'PAID ADS · TikTok',            stats: '+1.8M Views · 8.3% Conv.',     src: eligirFuente(VIDEOS_FUENTES[1]),  color: '#2980b9' },
    { titulo: 'DA-R015 — Orgánico',          categoria: 'CONTENIDO ORGÁNICO · IG',      stats: '+3.1M Alcance · 9.2% ER',      src: eligirFuente(VIDEOS_FUENTES[2]),  color: '#8e44ad' },
    { titulo: 'Orgánico #12 — Storytelling', categoria: 'CONTENIDO ORGÁNICO · TikTok',  stats: '+5.7M Views · Viral',          src: eligirFuente(VIDEOS_FUENTES[3]),  color: '#16a085' },
    { titulo: 'Reel 3 — Ranger 570',         categoria: 'BRAND CONTENT · IG Reels',     stats: '+890K Views · 6.1% ER',        src: eligirFuente(VIDEOS_FUENTES[4]),  color: '#d35400' },
    { titulo: 'Doble Ranger — Acción',       categoria: 'BRAND CONTENT · YouTube Shorts', stats: '+1.2M Views · Trending #3',  src: eligirFuente(VIDEOS_FUENTES[5]),  color: '#27ae60' },
    { titulo: 'David Otálora Viral v2',      categoria: 'VIP CLIENT · RETENCIÓN',       stats: '+13M Views',                   src: 'ClientesVIP/Plan de contenido.mp4',  color: '#f39c12' },
    { titulo: 'Marcos Razzetti E-com',       categoria: 'VIP CLIENT · TIKTOK',          stats: '+35M Views',                   src: 'ClientesVIP/Marcos 3.mp4',           color: '#34495e' },
    { titulo: 'Oscar Hinojosa Launch',       categoria: 'VIP CLIENT · REELS',           stats: '+$1M Reven.',                  src: 'ClientesVIP/OH-R0042.mp4',           color: '#d1ccc0' },
  ];


  let indiceActivo = 0;
  let enTransicion = false;

  piezas.forEach((pieza, i) => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'portafolio-tarjeta' + (i === 0 ? ' activa' : '');
    tarjeta.dataset.index = i;
    tarjeta.style.setProperty('--color-acento', pieza.color);

    const videoThumb = document.createElement('video');
    // Lazy: sin src hasta que el carrusel sea visible
    videoThumb.dataset.src = pieza.src + '#t=0.1';
    videoThumb.muted = true;
    videoThumb.playsInline = true;
    videoThumb.preload = 'none'; // NO precargar nada
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

    tarjeta.addEventListener('click', () => seleccionarPieza(i));
  });

  // Lazy-cargar thumbnails cuando cada tarjeta entra en viewport
  // En mobile: cargar todos de inmediato (scroll interno no activa el observer)
  if (esTactil) {
    contenedor.querySelectorAll('.portafolio-tarjeta').forEach(t => {
      const video = t.querySelector('.portafolio-thumb');
      if (video && video.dataset.src) {
        video.src = video.dataset.src;
        video.preload = 'metadata';
        delete video.dataset.src;
      }
    });
  } else {
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target.querySelector('.portafolio-thumb');
          if (video && video.dataset.src) {
            video.src = video.dataset.src;
            video.preload = 'metadata';
            delete video.dataset.src;
          }
          lazyObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px', threshold: 0 });

    contenedor.querySelectorAll('.portafolio-tarjeta').forEach(t => lazyObserver.observe(t));
  }

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
    visorVideo.addEventListener('playing', () => {
      visorVideo.parentElement.classList.remove('pausado');
    });
    // Sincronizar estado del botón mute con cualquier cambio de volumen/mute
    visorVideo.addEventListener('volumechange', () => {
      if (!btnMute) return;
      btnMute.classList.toggle('muted', visorVideo.muted);
      btnMute.setAttribute('aria-label', visorVideo.muted ? 'Activar sonido' : 'Silenciar');
    });
  }

  if (btnMute) {
    btnMute.addEventListener('click', (e) => {
      e.stopPropagation();
      visorVideo.muted = !visorVideo.muted;
    });
  }

  function seleccionarPieza(idx) {
    if (enTransicion || idx === indiceActivo) return;
    enTransicion = true;

    contenedor.querySelector('.portafolio-tarjeta.activa')?.classList.remove('activa');
    indiceActivo = idx;
    const pieza = piezas[idx];

    contenedor.querySelector(`[data-index="${idx}"]`)?.classList.add('activa');

    if (visorVideo) visorVideo.style.opacity = '0';
    if (visorTitulo) visorTitulo.style.opacity = '0';
    if (visorCategoria) visorCategoria.style.opacity = '0';
    if (visorStats) visorStats.style.opacity = '0';

    setTimeout(() => {
      if (visorVideo) {
        visorVideo.src = pieza.src;
        visorVideo.load();
        visorVideo.muted = false;
        visorVideo.play().catch(() => {});
        visorVideo.style.opacity = '1';
      }
      if (visorTitulo)    { visorTitulo.textContent = pieza.titulo;    visorTitulo.style.opacity = '1'; }
      if (visorCategoria) { visorCategoria.textContent = pieza.categoria; visorCategoria.style.opacity = '1'; }
      if (visorStats)     { visorStats.textContent = pieza.stats;     visorStats.style.opacity = '1'; }
      if (captionTitulo)  captionTitulo.textContent = pieza.titulo;
      if (captionCat)     captionCat.textContent = pieza.categoria;
      enTransicion = false;
    }, 350);
  }

  // Primer video del visor — se carga solo cuando el portafolio entra en vista
  const portObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        visorVideo?.pause();
      } else {
        if (visorVideo && !visorVideo.src) {
          visorVideo.src = piezas[0].src;
        }
        if (!visorVideo?.parentElement?.classList.contains('pausado')) {
          visorVideo?.play().catch(() => {});
        }
      }
    });
  }, { threshold: 0.1 });

  if (visorVideo) portObserver.observe(visorVideo);
  if (visorTitulo)    visorTitulo.textContent    = piezas[0].titulo;
  if (visorCategoria) visorCategoria.textContent = piezas[0].categoria;
  if (visorStats)     visorStats.textContent     = piezas[0].stats;
  if (captionTitulo)  captionTitulo.textContent  = piezas[0].titulo;
  if (captionCat)     captionCat.textContent     = piezas[0].categoria;
}
