/**
 * app.js — Arranque, navegación y estructura de la aplicación.
 *
 * Secuencia de apertura:
 *  1. index.html ya muestra el splash (sin esperar JavaScript).
 *  2. Si hay sesión: se monta la estructura y se pinta el último dashboard guardado.
 *  3. En segundo plano: una sola llamada (sistema.bootstrap) actualiza todo.
 */
import { CONFIG } from './config.js';
import { auth } from './auth.js';
import { api } from './api.js';
import { idbGet, idbSet, idbLimpiar } from './idb.js';
import { h, icono, toast, ROLES, errorCarga, logoCoahuila } from './ui.js';

export const estado = { boot: null, bootLocal: false };
export const puede = (accion) => !!(estado.boot && estado.boot.permisos && estado.boot.permisos.includes(accion));
export const esGlobal = () => !!(estado.boot && estado.boot.ambito && estado.boot.ambito.tipo === 'GLOBAL');

const RUTAS = {
  login:         { publica: true, carga: () => import('./views/login.js') },
  registro:      { publica: true, carga: () => import('./views/registro.js') },
  inicio:        { carga: () => import('./views/inicio.js') },
  usuarios:      { permiso: 'usuarios.list', carga: () => import('./views/usuarios.js') },
  regiones:      { permiso: 'regiones.guardar', carga: () => import('./views/regiones.js') },
  agrupamientos: { permiso: 'agrupamientos.list', carga: () => import('./views/agrupamientos.js') },
  cuenta:        { carga: () => import('./views/cuenta.js') }
};

const MENU = [
  { ruta: 'inicio', texto: 'Inicio', icono: 'inicio' },
  { ruta: 'usuarios', texto: 'Usuarios', icono: 'usuarios', visible: () => puede('usuarios.list') },
  { ruta: 'regiones', texto: 'Regiones', icono: 'regiones', visible: () => puede('regiones.guardar') },
  { ruta: 'agrupamientos', texto: 'Agrupamientos', icono: 'agrupamientos', visible: () => puede('agrupamientos.list') && estado.boot.ambito.tipo !== 'AGRUP' },
  { ruta: 'cuenta', texto: 'Mi cuenta', icono: 'cuenta' }
];

let navActual = null;   // AbortController de la vista actual

export function ir(ruta) {
  const destino = '#/' + ruta;
  if (location.hash === destino) navegar();
  else location.hash = destino;
}

/* ───────────── Bootstrap ───────────── */

/**
 * Carga datos del usuario. Si hay copia local, la usa de inmediato y actualiza en segundo plano.
 * esperar=true obliga a esperar al servidor (tras iniciar sesión).
 */
export async function cargarBoot({ esperar = false } = {}) {
  if (!estado.boot && !esperar) {
    const local = await idbGet('boot');
    if (local && local.huella === auth.huella()) { estado.boot = local.data; estado.bootLocal = true; }
  }
  const peticion = api('sistema.bootstrap').then((data) => {
    estado.boot = data;
    estado.bootLocal = false;
    idbSet('boot', { huella: auth.huella(), data, guardado: Date.now() });
    pintarShell();
    window.dispatchEvent(new Event('boot:actualizado'));
    return data;
  });
  if (!estado.boot || esperar) return peticion;
  peticion.catch((e) => {
    if (e.codigo === 'SIN_CONEXION' || e.codigo === 'TIEMPO_AGOTADO') {
      toast('Sin conexión. Mostrando información disponible en el dispositivo.', 'aviso');
    }
  });
  return estado.boot;
}

export async function alIniciarSesion() {
  estado.boot = null;
  await cargarBoot({ esperar: true });
  ir(estado.boot.usuario.debe_cambiar_pass ? 'cuenta' : 'inicio');
}

export async function cerrarSesion() {
  try { await api('auth.logout', {}, { timeout: 8000 }); } catch { /* se cierra localmente de todos modos */ }
  terminarLocal();
  ir('login');
}

function terminarLocal() {
  auth.limpiar();
  estado.boot = null;
  idbLimpiar();
  const shell = document.getElementById('shell');
  if (shell) shell.remove();
}

/* ───────────── Estructura ───────────── */

function montarShell() {
  if (document.getElementById('shell')) return;
  document.getElementById('app').replaceChildren(
    h('div', { id: 'shell', class: 'shell' },
      h('header', { class: 'top' },
        h('img', { src: 'assets/img/logo-policia-blanco-96.webp', width: 38, height: 38, alt: 'Policía Estatal Coahuila' }),
        h('div', { class: 'top-t' }, h('strong', {}, 'Control Vehicular'), h('span', { id: 'top-sub' }, ''))
      ),
      h('nav', { class: 'nav', id: 'nav', 'aria-label': 'Menú principal' }),
      h('main', { id: 'vista', class: 'vista', tabindex: '-1' })
    )
  );
}

function montarPublico() {
  if (document.getElementById('publico')) return;
  document.getElementById('app').replaceChildren(h('main', { id: 'publico', class: 'publico' }, h('div', { id: 'vista' })));
}

function pintarShell() {
  const b = estado.boot;
  const nav = document.getElementById('nav');
  if (!b || !nav) return;
  const sub = document.getElementById('top-sub');
  const nombres = b.ambito_nombres || {};
  sub.textContent = [ROLES[b.usuario.rol], nombres.agrupamiento || nombres.region].filter(Boolean).join(' · ');

  const actual = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'inicio';
  const pendientes = b.pendientes && b.pendientes.usuarios;
  nav.replaceChildren(
    ...MENU.filter((m) => !m.visible || m.visible()).map((m) =>
      h('a', { href: '#/' + m.ruta, class: 'nav-i' + (m.ruta === actual ? ' activo' : ''), 'aria-current': m.ruta === actual ? 'page' : null },
        icono(m.icono),
        h('span', {}, m.texto),
        m.ruta === 'usuarios' && pendientes ? h('b', { class: 'insignia', 'aria-label': pendientes + ' pendientes' }, String(pendientes)) : null
      )),
    logoCoahuila('nav-logo')
  );
}

/* ───────────── Navegación ───────────── */

async function navegar() {
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  const pedida = partes[0];
  let nombre = RUTAS[pedida] ? pedida : (auth.activa() ? 'inicio' : 'login');
  const def = RUTAS[nombre];

  if (!def.publica && !auth.activa()) return ir('login');
  if (def.publica && auth.activa()) return ir('inicio');

  if (navActual) navActual.abort();
  const ctrl = new AbortController();
  navActual = ctrl;

  if (def.publica) {
    montarPublico();
  } else {
    montarShell();
    const vista = document.getElementById('vista');
    if (!estado.boot) {
      vista.replaceChildren(h('div', { class: 'cargando-vista', 'aria-busy': 'true' }, h('div', { class: 'sk-l sk-l1' }), h('div', { class: 'sk-l sk-l2' })));
      try {
        await cargarBoot();
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (!auth.activa()) return ir('login');
        vista.replaceChildren(errorCarga(e, () => navegar()));
        return;
      }
      if (ctrl.signal.aborted) return;
    }
    pintarShell();
    if (estado.boot.usuario.debe_cambiar_pass && nombre !== 'cuenta') return ir('cuenta');
    if (def.permiso && !puede(def.permiso)) return ir('inicio');
  }

  const vista = document.getElementById('vista');
  try {
    const mod = await def.carga();
    if (ctrl.signal.aborted) return;
    vista.replaceChildren();
    await mod.render(vista, { params: partes.slice(1), signal: ctrl.signal });
    if (!def.publica) document.getElementById('vista').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    if (ctrl.signal.aborted) return;
    console.error(e);
    vista.replaceChildren(errorCarga({ message: 'No fue posible abrir esta sección. Revisa tu conexión.' }, () => navegar()));
  }
}

/* ───────────── Eventos globales ───────────── */

window.addEventListener('hashchange', navegar);

window.addEventListener('sesion:terminada', (e) => {
  terminarLocal();
  toast(e.detail || 'Tu sesión terminó. Inicia sesión de nuevo.', 'aviso', 6000);
  ir('login');
});

window.addEventListener('sesion:cambio-password', () => ir('cuenta'));

window.addEventListener('app:actualizar', () => {
  toast('Hay una versión nueva de la aplicación.', 'aviso', 0, { texto: 'Actualizar', fn: () => location.reload() });
});

window.addEventListener('online', () => {
  if (auth.activa()) cargarBoot().catch(() => {});
});

/* ───────────── Service Worker (instalación y actualizaciones) ───────────── */

let actualizacionPedida = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const avisar = (sw) => toast('Hay una versión nueva disponible.', 'info', 0, {
        texto: 'Actualizar', fn: () => { actualizacionPedida = true; sw.postMessage('ACTIVAR'); }
      });
      if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo);
        });
      });
    }).catch(() => { /* sin SW la app funciona, solo sin instalación ni caché */ });

    // Solo se recarga cuando el usuario pidió actualizar (nunca en la primera instalación).
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando || !actualizacionPedida) return;
      recargando = true;
      location.reload();
    });
  });
}

document.documentElement.dataset.version = CONFIG.VERSION;
navegar();
