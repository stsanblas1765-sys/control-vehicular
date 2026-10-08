/**
 * idb.js — Almacén local mínimo (IndexedDB) para pintar el dashboard al instante.
 * Solo guarda datos no sensibles del ámbito del usuario. Nunca información de gasolina.
 * Se borra completo al cerrar sesión.
 */
const DB = 'control-vehicular', VER = 1, ST = 'kv';
let conexion = null;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return conexion;
}

export async function idbGet(k) {
  try {
    const db = await abrir();
    return await new Promise((res, rej) => {
      const q = db.transaction(ST).objectStore(ST).get(k);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  } catch { return undefined; }
}

export async function idbSet(k, v) {
  try {
    const db = await abrir();
    await new Promise((res, rej) => {
      const tx = db.transaction(ST, 'readwrite');
      tx.objectStore(ST).put(v, k);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* el almacenamiento local es opcional */ }
}

export async function idbLimpiar() {
  try {
    const db = await abrir();
    await new Promise((res) => {
      const tx = db.transaction(ST, 'readwrite');
      tx.objectStore(ST).clear();
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch { /* */ }
}
