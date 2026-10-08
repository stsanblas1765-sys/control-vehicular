import { h, icono, fechaCorta, conCarga, toast, ROLES } from '../ui.js';
import { estado, cargarBoot } from '../app.js';

const INDICADORES = [
  { campo: 'total', texto: 'Vehículos', clase: 'ind-principal' },
  { campo: 'activos', texto: 'Activos', clase: 'ind-ok' },
  { campo: 'mantenimiento', texto: 'En mantenimiento', clase: 'ind-aviso' },
  { campo: 'baja', texto: 'Dados de baja', clase: 'ind-neutro' },
  { campo: 'pendientes', texto: 'Solicitudes pendientes', clase: 'ind-info' },
  { campo: 'alertas', texto: 'Alertas', clase: 'ind-error' }
];

export function render(cont, { signal }) {
  const pintar = () => {
    const b = estado.boot;
    const r = b.resumen || {};
    const n = b.ambito_nombres || {};
    const ambito = b.ambito.tipo === 'GLOBAL' ? 'Todo el estado' : [n.region, n.agrupamiento].filter(Boolean).join(' / ');
    const nombre = (b.usuario.nombre_completo || '').split(' ')[0];

    const refrescar = h('button', { class: 'btn btn-sec btn-chico', type: 'button' }, icono('recargar', 18), 'Actualizar');
    refrescar.addEventListener('click', () => conCarga(refrescar,
      () => cargarBoot({ esperar: true }).catch((e) => toast(e.message, 'error')),
      'Actualizando…'));

    cont.replaceChildren(
      h('div', { class: 'cab-vista' },
        h('div', {},
          h('h1', {}, 'Hola, ' + nombre.charAt(0) + nombre.slice(1).toLowerCase()),
          h('p', { class: 'sub' }, ROLES[b.usuario.rol] + ' · ' + ambito)),
        refrescar),

      b.pendientes && b.pendientes.usuarios
        ? h('a', { class: 'banda-aviso', href: '#/usuarios' },
            h('strong', {}, b.pendientes.usuarios === 1 ? '1 solicitud de acceso' : b.pendientes.usuarios + ' solicitudes de acceso'),
            h('span', {}, 'esperan tu validación. Revisar'))
        : null,

      h('section', { class: 'indicadores', 'aria-label': 'Resumen del parque vehicular' },
        INDICADORES.map((i) => h('div', { class: 'ind ' + i.clase },
          h('span', { class: 'ind-num' }, String(r[i.campo] ?? 0)),
          h('span', { class: 'ind-txt' }, i.texto)))),

      h('p', { class: 'nota' },
        estado.bootLocal
          ? 'Mostrando la información guardada en este dispositivo. Se actualizará al recuperar conexión.'
          : (r.actualizado_en ? 'Indicadores calculados: ' + fechaCorta(r.actualizado_en) : 'Aún no hay vehículos registrados.'))
    );
  };

  pintar();
  window.addEventListener('boot:actualizado', pintar, { signal });
}
