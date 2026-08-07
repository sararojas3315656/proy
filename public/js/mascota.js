(function () {
  var mascota = document.getElementById('mascota');
  if (!mascota) return;

  var root = document.documentElement;
  var ex = 0, ey = 0, hd = 0;
  var tx = 0, ty = 0, th = 0;

  window.addEventListener('mousemove', function (e) {
    var r = mascota.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var dist = Math.max(1, Math.hypot(dx, dy));
    var maxX = 5, maxY = 7;
    tx = (dx / dist) * Math.min(maxX, Math.abs(dx) / 30);
    ty = (dy / dist) * Math.min(maxY, Math.abs(dy) / 40);
    th = Math.max(-20, Math.min(20, dx / 7));
  });

  function frame() {
    ex += (tx - ex) * 0.14;
    ey += (ty - ey) * 0.14;
    hd += (th - hd) * 0.14;
    root.style.setProperty('--mx', ex.toFixed(2) + 'px');
    root.style.setProperty('--my', ey.toFixed(2) + 'px');
    root.style.setProperty('--m', hd.toFixed(2));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function parpadear() {
    mascota.classList.add('m-parpadeo');
    setTimeout(function () {
      mascota.classList.remove('m-parpadeo');
      setTimeout(programarParpadeo, 300 + Math.random() * 500);
    }, 160);
  }
  function programarParpadeo() {
    setTimeout(parpadear, 2600 + Math.random() * 4000);
  }
  programarParpadeo();

  function lanzarCorazones(cantidad) {
    for (var i = 0; i < cantidad; i++) {
      var h = document.createElement('span');
      h.className = 'm-corazon';
      h.textContent = '\u2665';
      h.style.left = (34 + Math.random() * 52) + 'px';
      h.style.setProperty('--rx', ((Math.random() * 2 - 1) * 70).toFixed(0) + 'px');
      h.style.setProperty('--s', (0.7 + Math.random() * 0.9).toFixed(2));
      h.style.setProperty('--dl', (Math.random() * 500).toFixed(0) + 'ms');
      mascota.appendChild(h);
      (function (el) {
        setTimeout(function () { el.remove(); }, 3000);
      })(h);
    }
  }

  function lanzarEstrellas(cantidad) {
    for (var i = 0; i < cantidad; i++) {
      var e = document.createElement('span');
      e.className = 'm-estrella';
      e.textContent = '\u2726';
      e.style.left = (34 + Math.random() * 52) + 'px';
      e.style.setProperty('--rx', ((Math.random() * 2 - 1) * 80).toFixed(0) + 'px');
      e.style.setProperty('--s', (0.6 + Math.random() * 0.9).toFixed(2));
      e.style.setProperty('--dl', (Math.random() * 500).toFixed(0) + 'ms');
      mascota.appendChild(e);
      (function (el) {
        setTimeout(function () { el.remove(); }, 3000);
      })(e);
    }
  }

  function festejar() {
    mascota.classList.remove('m-salto');
    void mascota.offsetWidth;
    mascota.classList.add('m-salto');
    mascota.classList.add('m-feliz');
    setTimeout(function () {
      mascota.classList.remove('m-salto');
      mascota.classList.remove('m-feliz');
    }, 700);
    lanzarCorazones(5);
  }

  function vestir(rol) {
    mascota.setAttribute('data-rol', rol || '');
  }

  var acciones = {
    ciudadano: 'm-saluda',
    empresa: 'm-sorbo',
    autoridad: 'm-enoja',
    organizacion: 'm-teclea'
  };
  var duracion = {
    'm-saluda': 2000,
    'm-sorbo': 1800,
    'm-enoja': 1600,
    'm-teclea': 2600
  };

  mascota.addEventListener('click', function () {
    var rol = mascota.getAttribute('data-rol') || '';
    var clase = acciones[rol];
    if (clase) {
      mascota.classList.remove('m-saluda', 'm-sorbo', 'm-enoja', 'm-teclea', 'm-giro');
      void mascota.offsetWidth;
      mascota.classList.add(clase);
      setTimeout(function () {
        mascota.classList.remove(clase);
      }, duracion[clase]);
    } else {
      mascota.classList.remove('m-giro');
      void mascota.offsetWidth;
      mascota.classList.add('m-giro');
      setTimeout(function () {
        mascota.classList.remove('m-giro');
      }, 720);
      lanzarEstrellas(6);
    }
  });

  var tarjetas = Array.prototype.slice.call(document.querySelectorAll('.rol-card[data-rol]'));
  tarjetas.forEach(function (card) {
    card.addEventListener('click', function () {
      var rol = card.getAttribute('data-rol');
      vestir(rol);
      if (rol === 'ciudadano') {
        festejar();
        return;
      }
if (rol === 'ciudadano') {
        festejar();
        return;
      }
      if (rol === 'organizacion') {
        mascota.classList.remove('m-organizacion');
        void mascota.offsetWidth;
        mascota.classList.add('m-organizacion');
        setTimeout(function () {
          mascota.classList.remove('m-organizacion');
        }, 2200);
        return;
      }
      var clase = acciones[rol];
      if (clase) {
        mascota.classList.remove('m-saluda', 'm-sorbo', 'm-enoja', 'm-teclea', 'm-giro');
        void mascota.offsetWidth;
        mascota.classList.add(clase);
        setTimeout(function () {
          mascota.classList.remove(clase);
        }, duracion[clase]);
      }
    });
  });

  vestir(mascota.getAttribute('data-rol') || '');
})();