// ═══════════════════════════════════════════════════════
//  main.js — Portafolio Editor de Video
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  iniciarCursor();
  iniciarParticulas();
  iniciarTypewriter();
  generarMarcasTimeline();
});

// ─── Marcas de la regla del timeline ─────────────────
function generarMarcasTimeline() {
  const contenedor = document.getElementById('regla-marcas');
  if (!contenedor) return;

  // 60 marcas pequeñas, cada 5 hay una mayor con número
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

  let rX = 0, rY = 0;   // posición del anillo (con lag)
  let pX = 0, pY = 0;   // posición del punto (inmediata)
  let animId;

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
    animId = requestAnimationFrame(animarAnillo);
  }
  animarAnillo();

  // Agrandar en hover de elementos interactivos
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
  const CANTIDAD = 55;

  function redimensionar() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function crearParticula() {
    return {
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      vx:  (Math.random() - 0.5) * 0.25,
      vy:  (Math.random() - 0.5) * 0.25,
      r:   Math.random() * 1.2 + 0.3,
      a:   Math.random() * 0.4 + 0.05,
      // cian o púrpura aleatorio
      color: Math.random() > 0.55 ? '0, 229, 255' : '168, 85, 247',
    };
  }

  function inicializar() {
    redimensionar();
    particulas = Array.from({ length: CANTIDAD }, crearParticula);
  }

  function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particulas.forEach(p => {
      // mover
      p.x += p.vx;
      p.y += p.vy;

      // rebote suave en bordes
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // dibujar
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.a})`;
      ctx.fill();
    });

    // Líneas entre partículas cercanas
    for (let i = 0; i < particulas.length; i++) {
      for (let j = i + 1; j < particulas.length; j++) {
        const dx   = particulas[i].x - particulas[j].x;
        const dy   = particulas[i].y - particulas[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          const alpha = (1 - dist / 90) * 0.06;
          ctx.beginPath();
          ctx.moveTo(particulas[i].x, particulas[i].y);
          ctx.lineTo(particulas[j].x, particulas[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
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
    'Especialista en contenido corto.',
    'Reels que generan millones de views.',
    'Edición que captura en los primeros 3s.',
  ];

  let idxTexto  = 0;
  let idxChar   = 0;
  let borrando  = false;
  let pausando  = false;

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
        borrando  = false;
        idxTexto  = (idxTexto + 1) % textos.length;
        setTimeout(escribir, 300);
      } else {
        setTimeout(escribir, 25);
      }
    }
  }

  // Esperar a que la animación de entrada termine (~1.2s)
  setTimeout(escribir, 1200);
}
