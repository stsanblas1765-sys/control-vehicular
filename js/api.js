/**
 * api.js — Único punto de contacto con el backend.
 * POST con text/plain (evita el preflight CORS que Apps Script no soporta).
 * El token viaja en el cuerpo porque Apps Script no lee encabezados.
 */
import { CONFIG } from './config.js';
import { auth } from './auth.js';

export class ApiError extends Error {
  constructor(codigo, mensaje, extra) { super(mensaje); this.codigo = codigo; this.extra = extra; }
}

const SESION_TERMINADA = ['NO_AUTENTICADO', 'SESION_INVALIDA', 'SESION_EXPIRADA'];
const enCurso = new Map();

/** Llama una acción. Peticiones idénticas simultáneas se unen en una sola (evita dobles envíos). */
export function api(accion, params = {}, opciones = {}) {
  const clave = accion + '|' + JSON.stringify(params);
  if (enCurso.has(clave)) return enCurso.get(clave);
  const p = ejecutar(accion, params, opciones.timeout || 30000).finally(() => enCurso.delete(clave));
  enCurso.set(clave, p);
  return p;
}

async function ejecutar(accion, params, timeout) {
  if (!CONFIG.API_URL || CONFIG.API_URL.startsWith('PEGA_AQUI')) {
    throw new ApiError('CONFIG', 'Falta configurar la dirección del servidor en js/config.js.');
  }
  if (!navigator.onLine) throw new ApiError('SIN_CONEXION', 'Sin conexión a Internet.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion, params, token: auth.token(), v: CONFIG.VERSION, cliente: navigator.userAgent.slice(0, 200) }),
      signal: ctrl.signal,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store'
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new ApiError('TIEMPO_AGOTADO', 'El servidor tardó demasiado en responder. Intenta nuevamente.');
    throw new ApiError('SIN_CONEXION', 'No fue posible conectar con el servidor. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
  }

  let json;
  try { json = await res.json(); } catch {
    throw new ApiError('RESPUESTA_INVALIDA', 'El servidor respondió de forma inesperada. Intenta nuevamente.');
  }

  if (!json.ok) {
    const { codigo = 'ERROR', mensaje = 'Ocurrió un error.', extra } = json.error || {};
    if (SESION_TERMINADA.includes(codigo) && auth.activa()) {
      auth.limpiar();
      window.dispatchEvent(new CustomEvent('sesion:terminada', { detail: mensaje }));
    }
    if (codigo === 'CAMBIO_PASSWORD_REQUERIDO') window.dispatchEvent(new Event('sesion:cambio-password'));
    if (codigo === 'ACTUALIZACION_REQUERIDA') window.dispatchEvent(new Event('app:actualizar'));
    throw new ApiError(codigo, mensaje, extra);
  }
  return json.data;
}
