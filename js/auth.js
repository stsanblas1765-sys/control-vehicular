/**
 * auth.js — Token de sesión.
 * Se guarda en localStorage para que la sesión siga abierta al cerrar la app,
 * hasta que el usuario pulse "Cerrar sesión" o el servidor la revoque.
 */
const CLAVE = 'cv_token';
let token = null;
try { token = localStorage.getItem(CLAVE); } catch { token = null; }

export const auth = {
  token: () => token,
  activa: () => !!token,
  guardar(t) { token = t; try { localStorage.setItem(CLAVE, t); } catch { /* modo privado */ } },
  limpiar() { token = null; try { localStorage.removeItem(CLAVE); } catch { /* */ } },
  /** Huella corta para asociar datos locales a esta sesión sin guardar el token completo. */
  huella: () => (token ? token.slice(-12) : '')
};
