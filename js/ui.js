/**
 * ui.js — Componentes de interfaz.
 * Todo el contenido que viene del servidor se inserta como texto (nunca innerHTML),
 * lo que evita inyección de código.
 */

/** Crea un elemento: h('div', { class: 'x', onclick: fn }, 'texto', otroNodo) */
export function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* ───────────── Íconos (SVG estático, sin datos del servidor) ───────────── */

const RUTAS_ICONO = {
  inicio: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  usuarios: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.3 3.1-6 7-6s7 2.7 7 6M16 3.5a4 4 0 0 1 0 7.5M18 14c2.4.6 4 2.6 4 6',
  regiones: 'M9 3 3 5.5v15L9 18l6 2.5 6-2.5v-15L15 5.5 9 3Zm0 0v15m6-12.5v15',
  agrupamientos: 'M12 3 3 7l9 4 9-4-9-4Zm-9 9 9 4 9-4M3 17l9 4 9-4',
  cuenta: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  ojo: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  recargar: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6 6 18',
  salir: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3'
};

export function icono(nombre, tam = 22) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', tam);
  svg.setAttribute('height', tam);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ico');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', RUTAS_ICONO[nombre] || '');
  svg.append(p);
  return svg;
}

/* ───────────── Etiquetas ───────────── */

export const ROLES = {
  MAESTRO: 'Maestro',
  SUPERVISOR: 'Supervisor',
  REGION: 'Región',
  AGRUPAMIENTO: 'Agrupamiento'
};

const CLASE_ESTADO = {
  ACTIVO: 'ok', PENDIENTE: 'aviso', SUSPENDIDO: 'error', RECHAZADO: 'neutro', INACTIVO: 'neutro'
};
const TEXTO_ESTADO = {
  ACTIVO: 'Activo', PENDIENTE: 'Pendiente', SUSPENDIDO: 'Suspendido', RECHAZADO: 'Rechazado', INACTIVO: 'Inactivo'
};

export function chipEstado(estado) {
  return h('span', { class: 'chip chip-' + (CLASE_ESTADO[estado] || 'neutro') }, TEXTO_ESTADO[estado] || estado || '—');
}

/* ───────────── Avisos ───────────── */

function contenedorToasts() {
  let c = document.getElementById('toasts');
  if (!c) { c = h('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite' }); document.body.append(c); }
  return c;
}

/** tipo: info | ok | aviso | error. ms=0 deja el aviso fijo. accion: { texto, fn } */
export function toast(mensaje, tipo = 'info', ms = 4000, accion = null) {
  const t = h('div', { class: 'toast toast-' + tipo, role: tipo === 'error' ? 'alert' : 'status' },
    h('span', {}, mensaje),
    accion ? h('button', { class: 'toast-btn', type: 'button', onclick: () => { accion.fn(); t.remove(); } }, accion.texto) : null
  );
  contenedorToasts().append(t);
  if (ms) setTimeout(() => t.remove(), ms);
  return t;
}

/* ───────────── Modal ───────────── */

export function modal({ titulo, contenido, alCerrar }) {
  const anterior = document.activeElement;
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener('keydown', esc);
    if (anterior && anterior.focus) anterior.focus();
    if (alCerrar) alCerrar();
  };
  const esc = (e) => { if (e.key === 'Escape') cerrar(); };
  const caja = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'modal-cab' },
      h('h2', {}, titulo),
      h('button', { class: 'btn-ico', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))
    ),
    h('div', { class: 'modal-cuerpo' }, contenido)
  );
  const fondo = h('div', { class: 'modal-fondo', onclick: (e) => { if (e.target === fondo) cerrar(); } }, caja);
  document.body.append(fondo);
  document.addEventListener('keydown', esc);
  const primero = caja.querySelector('input, select, textarea, button.btn');
  if (primero) primero.focus();
  return { cerrar, caja };
}

export function confirmar(texto, { aceptar = 'Confirmar', peligro = false } = {}) {
  return new Promise((res) => {
    let resuelto = false;
    const m = modal({
      titulo: 'Confirmar',
      contenido: [
        h('p', {}, texto),
        h('div', { class: 'acciones' },
          h('button', { class: 'btn btn-sec', type: 'button', onclick: () => { resuelto = true; m.cerrar(); res(false); } }, 'Cancelar'),
          h('button', { class: 'btn ' + (peligro ? 'btn-peligro' : 'btn-pri'), type: 'button', onclick: () => { resuelto = true; m.cerrar(); res(true); } }, aceptar)
        )
      ],
      alCerrar: () => { if (!resuelto) res(false); }
    });
  });
}

/* ───────────── Formularios ───────────── */

export function campo(etiqueta, control, ayuda) {
  const id = control.id || ('c' + Math.random().toString(36).slice(2, 9));
  control.id = id;
  return h('div', { class: 'campo' },
    h('label', { for: id }, etiqueta),
    control,
    ayuda ? h('small', { class: 'ayuda' }, ayuda) : null
  );
}

export function entrada(name, attrs = {}) {
  return h('input', Object.assign({ name, type: 'text' }, attrs));
}

export function seleccion(name, opciones, valor, placeholder, attrs = {}) {
  const s = h('select', Object.assign({ name }, attrs));
  if (placeholder) s.append(h('option', { value: '' }, placeholder));
  for (const o of opciones) {
    if (o.grupo) {
      const g = h('optgroup', { label: o.grupo });
      o.opciones.forEach((x) => g.append(h('option', { value: x.valor }, x.etiqueta)));
      s.append(g);
    } else {
      s.append(h('option', { value: o.valor }, o.etiqueta));
    }
  }
  s.value = valor ?? '';
  return s;
}

/** Campo de contraseña con botón para mostrar/ocultar. */
export function entradaPassword(name, autocomplete) {
  const input = h('input', { name, type: 'password', autocomplete, required: true, maxlength: 128 });
  const btn = h('button', { type: 'button', class: 'btn-ico pass-ver', 'aria-label': 'Mostrar contraseña',
    onclick: () => {
      const ver = input.type === 'password';
      input.type = ver ? 'text' : 'password';
      btn.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    } }, icono('ojo', 20));
  const envoltura = h('div', { class: 'pass' }, input, btn);
  envoltura.id = '';
  Object.defineProperty(envoltura, 'id', { get: () => input.id, set: (v) => { input.id = v; } });
  return envoltura;
}

export function datosForm(form) {
  const d = {};
  new FormData(form).forEach((v, k) => { d[k] = typeof v === 'string' ? v.trim() : v; });
  return d;
}

/** Ejecuta fn con el botón deshabilitado y texto de progreso. */
export async function conCarga(boton, fn, texto = 'Procesando…') {
  const original = boton.textContent;
  boton.disabled = true;
  boton.textContent = texto;
  try { return await fn(); } finally { boton.disabled = false; boton.textContent = original; }
}

export function alerta(tipo = 'error') {
  return h('div', { class: 'alerta alerta-' + tipo, role: 'alert', hidden: true });
}

export function mostrarAlerta(el, mensaje, tipo = 'error') {
  el.className = 'alerta alerta-' + tipo;
  el.textContent = mensaje;
  el.hidden = false;
}

/* ───────────── Estados de carga ───────────── */

export function skeletonLista(n = 4) {
  return h('div', { class: 'lista', 'aria-busy': 'true', 'aria-label': 'Cargando' },
    Array.from({ length: n }, () => h('div', { class: 'item sk' }, h('div', { class: 'sk-l sk-l1' }), h('div', { class: 'sk-l sk-l2' }))));
}

export function vacio(texto, accion) {
  return h('div', { class: 'vacio' }, h('p', {}, texto), accion || null);
}

export function errorCarga(err, reintentar) {
  return h('div', { class: 'vacio vacio-error', role: 'alert' },
    h('p', {}, err && err.message ? err.message : 'No fue posible cargar la información.'),
    reintentar ? h('button', { class: 'btn btn-sec', type: 'button', onclick: reintentar }, 'Intentar de nuevo') : null);
}

/* ───────────── Logos ───────────── */

export function cabeceraAuth(subtitulo) {
  return h('div', { class: 'auth-cab' },
    h('img', { src: 'assets/img/logo-policia-256.webp', width: 112, height: 112, alt: 'Policía Estatal Coahuila' }),
    h('div', { class: 'auth-marca' }, 'Control Vehicular'),
    subtitulo ? h('p', { class: 'auth-sub' }, subtitulo) : null);
}

export function logoCoahuila(clase = 'logo-coah') {
  return h('img', { class: clase, src: 'assets/img/logo-coahuila.webp', width: 200, height: 54, alt: 'Coahuila pa’ delante', loading: 'lazy' });
}

export function fechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function debounce(fn, ms = 350) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
