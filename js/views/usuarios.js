import {
  h, campo, seleccion, datosForm, conCarga, alerta, mostrarAlerta, modal, confirmar, toast,
  chipEstado, skeletonLista, vacio, errorCarga, fechaCorta, debounce, ROLES
} from '../ui.js';
import { api } from '../api.js';
import { puede, cargarBoot } from '../app.js';

const PESTANAS = [
  { id: 'PENDIENTE', texto: 'Pendientes' },
  { id: 'ACTIVO', texto: 'Activos' },
  { id: 'SUSPENDIDO', texto: 'Suspendidos' },
  { id: '', texto: 'Todos' }
];

export async function render(cont, { signal }) {
  const esMaestro = puede('usuarios.acceso');
  const st = { estado: 'PENDIENTE', q: '', pagina: 1, paginas: 1 };
  let org = { regiones: [], agrupamientos: [] };

  const lista = h('div', { class: 'lista' });
  const masBtn = h('button', { class: 'btn btn-sec btn-bloque', type: 'button', hidden: true }, 'Cargar más');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const buscar = h('input', { type: 'search', class: 'buscar', placeholder: 'Buscar por nombre, teléfono o número de empleado', 'aria-label': 'Buscar usuarios' });

  cont.append(
    h('div', { class: 'cab-vista' },
      h('div', {}, h('h1', {}, 'Usuarios'),
        h('p', { class: 'sub' }, esMaestro ? 'Valida solicitudes y asigna el tipo de acceso.' : 'Consulta de usuarios registrados.'))),
    tabs, buscar, lista, masBtn
  );

  function pintarTabs() {
    tabs.replaceChildren(...PESTANAS.map((p) => h('button', {
      type: 'button', role: 'tab', class: 'tab' + (st.estado === p.id ? ' activo' : ''), 'aria-selected': String(st.estado === p.id),
      onclick: () => { st.estado = p.id; st.pagina = 1; pintarTabs(); cargar(true); }
    }, p.texto)));
  }

  function nombreAmbito(u) {
    if (u.rol === 'REGION') {
      const r = org.regiones.find((x) => x.region_id === u.region_id);
      return r ? r.nombre : '';
    }
    if (u.rol === 'AGRUPAMIENTO') {
      const a = org.agrupamientos.find((x) => x.agrup_id === u.agrup_id);
      return a ? a.nombre + ' (' + a.region_nombre + ')' : '';
    }
    return u.rol ? 'Todo el estado' : '';
  }

  function tarjeta(u) {
    const acciones = [];
    if (esMaestro) {
      if (u.estado === 'PENDIENTE') {
        acciones.push(h('button', { class: 'btn btn-pri btn-chico', type: 'button', onclick: () => abrirAcceso(u) }, 'Asignar acceso'));
        acciones.push(h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => abrirRechazo(u) }, 'Rechazar'));
      } else if (u.estado === 'RECHAZADO') {
        acciones.push(h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => abrirAcceso(u) }, 'Asignar acceso'));
      } else {
        acciones.push(h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => abrirAcceso(u) }, 'Editar acceso'));
        acciones.push(h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => restablecer(u) }, 'Restablecer contraseña'));
      }
    }
    return h('article', { class: 'item' },
      h('div', { class: 'item-cab' }, h('strong', {}, u.nombre_completo), chipEstado(u.estado)),
      h('div', { class: 'item-datos' },
        h('span', {}, h('a', { href: 'tel:' + u.telefono }, u.telefono)),
        u.cargo ? h('span', {}, u.cargo) : null,
        u.numero_empleado ? h('span', {}, 'Empleado ' + u.numero_empleado) : null),
      u.rol
        ? h('p', { class: 'item-rol' }, h('b', {}, ROLES[u.rol]), ' · ', nombreAmbito(u))
        : h('p', { class: 'item-declara' }, 'Declara: ', u.adscripcion_declarada || '—'),
      u.estado === 'RECHAZADO' && u.motivo_rechazo ? h('p', { class: 'item-nota' }, 'Motivo: ' + u.motivo_rechazo) : null,
      h('p', { class: 'item-nota' }, u.estado === 'PENDIENTE' ? 'Solicitó acceso: ' + fechaCorta(u.creado_en) : 'Último acceso: ' + fechaCorta(u.ultimo_acceso)),
      acciones.length ? h('div', { class: 'item-acc' }, acciones) : null
    );
  }

  async function cargar(reiniciar) {
    if (reiniciar) { st.pagina = 1; lista.replaceChildren(skeletonLista(4)); masBtn.hidden = true; }
    try {
      const r = await api('usuarios.list', { estado: st.estado, q: st.q, pagina: st.pagina });
      if (signal.aborted) return;
      if (reiniciar) lista.replaceChildren();
      st.paginas = r.paginas;
      if (!r.items.length && reiniciar) {
        lista.append(vacio(st.estado === 'PENDIENTE' ? 'No hay solicitudes pendientes.' : 'No hay usuarios con este filtro.'));
      }
      r.items.forEach((u) => lista.append(tarjeta(u)));
      masBtn.hidden = st.pagina >= st.paginas;
    } catch (e) {
      if (signal.aborted) return;
      lista.replaceChildren(errorCarga(e, () => cargar(true)));
    }
  }

  masBtn.addEventListener('click', () => conCarga(masBtn, async () => { st.pagina++; await cargar(false); }, 'Cargando…'));
  buscar.addEventListener('input', debounce(() => { st.q = buscar.value.trim(); cargar(true); }));

  /* ───── Modales del MAESTRO ───── */

  function abrirAcceso(u) {
    const aviso = alerta();
    const rol = seleccion('rol', Object.entries(ROLES).map(([valor, etiqueta]) => ({ valor, etiqueta })), u.rol || '', 'Selecciona…', { required: true });
    const region = seleccion('region_id',
      org.regiones.filter((r) => r.estado === 'ACTIVO').map((r) => ({ valor: r.region_id, etiqueta: r.nombre })),
      u.region_id, 'Selecciona la región…');
    const porRegion = {};
    org.agrupamientos.filter((a) => a.estado === 'ACTIVO').forEach((a) => {
      (porRegion[a.region_nombre] = porRegion[a.region_nombre] || []).push({ valor: a.agrup_id, etiqueta: a.nombre });
    });
    const agrup = seleccion('agrup_id', Object.keys(porRegion).map((g) => ({ grupo: g, opciones: porRegion[g] })), u.agrup_id, 'Selecciona el agrupamiento…');
    const campoRegion = campo('Región', region);
    const campoAgrup = campo('Agrupamiento', agrup, 'La región se asigna automáticamente según el agrupamiento.');
    const editable = u.estado === 'ACTIVO' || u.estado === 'SUSPENDIDO';
    const est = seleccion('estado', [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'SUSPENDIDO', etiqueta: 'Suspendido (sin acceso)' }], editable ? u.estado : 'ACTIVO');

    const ayudaRol = h('p', { class: 'ayuda-rol' });
    const AYUDA = {
      MAESTRO: 'Acceso total, incluida la información de gasolina.',
      SUPERVISOR: 'Acceso a todo el sistema excepto gasolina. No asigna accesos.',
      REGION: 'Solo la información de su región.',
      AGRUPAMIENTO: 'Solo la información de su agrupamiento. Registra sus vehículos.'
    };
    const actualizar = () => {
      campoRegion.hidden = rol.value !== 'REGION';
      campoAgrup.hidden = rol.value !== 'AGRUPAMIENTO';
      ayudaRol.textContent = AYUDA[rol.value] || '';
    };
    rol.addEventListener('change', actualizar);

    const boton = h('button', { class: 'btn btn-pri', type: 'submit' }, u.estado === 'PENDIENTE' ? 'Aprobar y dar acceso' : 'Guardar cambios');
    const form = h('form', { class: 'form', novalidate: true },
      h('div', { class: 'resumen-solicitud' },
        h('strong', {}, u.nombre_completo),
        h('span', {}, u.telefono + (u.numero_empleado ? ' · Empleado ' + u.numero_empleado : '')),
        h('span', {}, 'Declara: ' + (u.adscripcion_declarada || '—'))),
      campo('Tipo de usuario', rol), ayudaRol, campoRegion, campoAgrup,
      editable ? campo('Estado', est) : null,
      aviso,
      h('div', { class: 'acciones' }, boton)
    );
    actualizar();

    const m = modal({ titulo: u.estado === 'PENDIENTE' ? 'Validar solicitud' : 'Acceso del usuario', contenido: form });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(form);
      if (!d.rol) return mostrarAlerta(aviso, 'Selecciona el tipo de usuario.');
      if (d.rol === 'REGION' && !d.region_id) return mostrarAlerta(aviso, 'Selecciona la región.');
      if (d.rol === 'AGRUPAMIENTO' && !d.agrup_id) return mostrarAlerta(aviso, 'Selecciona el agrupamiento.');
      if (d.rol === 'MAESTRO' && !(await confirmar('El tipo Maestro tiene acceso total, incluida la gasolina. ¿Confirmas?', { aceptar: 'Sí, dar acceso Maestro', peligro: true }))) return;
      await conCarga(boton, async () => {
        try {
          await api('usuarios.acceso', {
            usuario_id: u.usuario_id, rol: d.rol, region_id: d.region_id || '', agrup_id: d.agrup_id || '',
            estado: d.estado || 'ACTIVO', version: u.version
          });
          m.cerrar();
          toast(u.estado === 'PENDIENTE' ? 'Acceso asignado.' : 'Acceso actualizado.', 'ok');
          cargar(true);
          cargarBoot({ esperar: true }).catch(() => {});
        } catch (e) { mostrarAlerta(aviso, e.message); }
      }, 'Guardando…');
    });
  }

  function abrirRechazo(u) {
    const aviso = alerta();
    const boton = h('button', { class: 'btn btn-peligro', type: 'submit' }, 'Rechazar solicitud');
    const form = h('form', { class: 'form', novalidate: true },
      h('p', {}, u.nombre_completo + ' · ' + u.telefono),
      campo('Motivo', h('textarea', { name: 'motivo', rows: 3, maxlength: 300, required: true }), 'La persona verá este motivo al intentar entrar.'),
      aviso, h('div', { class: 'acciones' }, boton));
    const m = modal({ titulo: 'Rechazar solicitud', contenido: form });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(form);
      if (!d.motivo) return mostrarAlerta(aviso, 'Escribe el motivo.');
      await conCarga(boton, async () => {
        try {
          await api('usuarios.rechazar', { usuario_id: u.usuario_id, motivo: d.motivo, version: u.version });
          m.cerrar(); toast('Solicitud rechazada.', 'ok'); cargar(true);
          cargarBoot({ esperar: true }).catch(() => {});
        } catch (e) { mostrarAlerta(aviso, e.message); }
      }, 'Rechazando…');
    });
  }

  async function restablecer(u) {
    const ok = await confirmar('Se generará una contraseña temporal para ' + u.nombre_completo + ' y se cerrarán sus sesiones abiertas.', { aceptar: 'Restablecer' });
    if (!ok) return;
    try {
      const r = await api('usuarios.resetPassword', { usuario_id: u.usuario_id });
      const copiar = h('button', { class: 'btn btn-sec', type: 'button' }, 'Copiar');
      copiar.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(r.password_temporal); copiar.textContent = 'Copiada'; } catch { copiar.textContent = 'Cópiala manualmente'; }
      });
      modal({
        titulo: 'Contraseña temporal',
        contenido: [
          h('p', {}, 'Entrégala directamente a ' + u.nombre_completo + '. Al entrar, el sistema le pedirá cambiarla.'),
          h('p', { class: 'clave-temporal' }, r.password_temporal),
          h('div', { class: 'acciones' }, copiar)
        ]
      });
    } catch (e) { toast(e.message, 'error', 6000); }
  }

  /* ───── Arranque de la vista ───── */
  pintarTabs();
  lista.replaceChildren(skeletonLista(4));
  try {
    const [r, a] = await Promise.all([api('regiones.list'), api('agrupamientos.list')]);
    org = { regiones: r.items, agrupamientos: a.items };
  } catch { /* los nombres de ámbito quedarán vacíos; la lista sigue funcionando */ }
  if (!signal.aborted) cargar(true);
}
