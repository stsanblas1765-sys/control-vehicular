/**
 * sw.js — Service Worker.
 * Cachea SOLO archivos estáticos de la app. Nunca intercepta la API (otro dominio)
 * ni guarda información del servidor. Sube VERSION en cada publicación.
 */
const VERSION = 'cv-1.0.1';
const ARCHIVOS = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/app.js', './js/api.js', './js/auth.js', './js/config.js', './js/idb.js', './js/ui.js',
  './js/views/login.js', './js/views/registro.js', './js/views/inicio.js', './js/views/usuarios.js',
  './js/views/regiones.js', './js/views/agrupamientos.js', './js/views/cuenta.js',
  './assets/img/logo-policia-256.webp', './assets/img/logo-policia-blanco-96.webp',
  './assets/img/logo-coahuila.webp', './assets/icons/favicon-32.png', './assets/icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'ACTIVAR') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API y externos: siempre red, nunca caché

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
      }
      return res;
    }))
  );
});
