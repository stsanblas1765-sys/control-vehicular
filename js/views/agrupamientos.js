import { h, icono, campo, entrada, seleccion, datosForm, conCarga, alerta, mostrarAlerta, modal, toast, chipEstado, skeletonLista, vacio, errorCarga } from '../ui.js';
import { api } from '../api.js';
import { puede, esGlobal } from '../app.js';

export async function render(cont, { signal }) {
  const editable = puede('agrupamientos.guardar');
  const global = esGlobal();
  let regiones = [];
  let filtroRegion = '';
  const lista = h('div', { class: 'lista' });
  const filtro = h('select', { class: 'buscar', 'aria-label': 'Filtrar por región', hidden: !global });

  cont.append(
    h('div', { class: 'cab-vista' },
      h('div', {}, h('h1', {}, 'Agrupamientos'),
        h('p', { class: 'sub' }, 'Cada agrupamiento pertenece a una región. Si opera en varias regiones, se registra en cada una.')),
      editable ? h('button', { class: 'btn btn-pri btn-chico', type: 'button', onclick: () => abrir(null) }, icono('mas', 18), 'Nuevo') : null),
    filtro, lista);

  filtro.addEventListener('change', () => { filtroRegion = filtro.value; cargar(); });

  async function cargar() {
    lista.replaceChildren(skeletonLista(4));
    try {
      const r = await api('agrupamientos.list', filtroRegion ? { region_id: filtroRegion } : {});
      if (signal.aborted) return;
      lista.replaceChildren();
      if (!r.items.length) {
        lista.append(vacio(regiones.length || !editable ? 'No hay agrupamientos registrados.' : 'Primero crea una región en el menú Regiones.'));
      }
      let regionActual = null;
      r.items.forEach((a) => {
        if (global && !filtroRegion && a.region_nombre !== regionActual) {
          regionActual = a.region_nombre;
          lista.append(h('h2', { class: 'grupo-t' }, 'Región ' + regionActual));
        }
        lista.append(h('article', { class: 'item' },
          h('div', { class: 'item-cab' }, h('strong', {}, a.nombre), chipEstado(a.estado)),
          h('div', { class: 'item-datos' }, h('span', {}, 'Clave ' + a.clave), h('span', {}, 'Región ' + a.region_nombre)),
          h('p', { class: 'item-rol' }, 'Encargado: ', a.encargado_nombre ? h('b', {}, a.encargado_nombre) : 'sin asignar'),
          editable ? h('div', { class: 'item-acc' }, h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => abrir(a) }, 'Editar')) : null));
      });
    } catch (e) {
      if (!signal.aborted) lista.replaceChildren(errorCarga(e, cargar));
    }
  }

  async function abrir(a) {
    const aviso = alerta();
    let encargadoSel = null;
    if (a) {
      encargadoSel = seleccion('encargado_id', [], a.encargado_id, 'Sin asignar');
      encargadoSel.disabled = true;
      api('usuarios.list', { agrup_id: a.agrup_id, rol: 'AGRUPAMIENTO', estado: 'ACTIVO', tam: 100 })
        .then((r) => {
          r.items.forEach((u) => encargadoSel.append(h('option', { value: u.usuario_id }, u.nombre_completo)));
          encargadoSel.value = a.encargado_id || '';
          encargadoSel.disabled = false;
        })
        .catch(() => { encargadoSel.replaceChildren(h('option', { value: a.encargado_id || '' }, a.encargado_nombre || 'Sin asignar')); });
    }
    const boton = h('button', { class: 'btn btn-pri', type: 'submit' }, a ? 'Guardar cambios' : 'Crear agrupamiento');
    const form = h('form', { class: 'form', novalidate: true },
      a ? h('p', { class: 'resumen-solicitud' }, h('span', {}, 'Región ' + a.region_nombre))
        : campo('Región', seleccion('region_id', regiones.filter((r) => r.estado === 'ACTIVO').map((r) => ({ valor: r.region_id, etiqueta: r.nombre })), filtroRegion, 'Selecciona…', { required: true }),
            'No se puede cambiar después de crearlo.'),
      campo('Nombre', entrada('nombre', { value: a ? a.nombre : '', maxlength: 100, required: true })),
      campo('Clave', entrada('clave', { value: a ? a.clave : '', maxlength: 20, required: true }), 'Única dentro de la región.'),
      a ? campo('Encargado de los vehículos', encargadoSel, 'Solo usuarios activos de tipo Agrupamiento de este agrupamiento.') : null,
      a ? campo('Estado', seleccion('estado', [{ valor: 'ACTIVO', etiqueta: 'Activo' }, { valor: 'INACTIVO', etiqueta: 'Inactivo' }], a.estado)) : null,
      campo('Observaciones', h('textarea', { name: 'observaciones', rows: 2, maxlength: 500 }, a ? a.observaciones : '')),
      aviso, h('div', { class: 'acciones' }, boton));
    const m = modal({ titulo: a ? 'Editar agrupamiento' : 'Nuevo agrupamiento', contenido: form });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(form);
      if (!a && !d.region_id) return mostrarAlerta(aviso, 'Selecciona la región.');
      if (!d.nombre || !d.clave) return mostrarAlerta(aviso, 'Nombre y clave son obligatorios.');
      if (a && encargadoSel.disabled) delete d.encargado_id;
      await conCarga(boton, async () => {
        try {
          await api('agrupamientos.guardar', Object.assign(d, a ? { agrup_id: a.agrup_id, version: a.version } : {}));
          m.cerrar(); toast(a ? 'Agrupamiento actualizado.' : 'Agrupamiento creado.', 'ok'); cargar();
        } catch (e) { mostrarAlerta(aviso, e.message); }
      }, 'Guardando…');
    });
  }

  if (global) {
    try {
      regiones = (await api('regiones.list')).items;
      filtro.replaceChildren(h('option', { value: '' }, 'Todas las regiones'),
        ...regiones.map((r) => h('option', { value: r.region_id }, r.nombre)));
    } catch { filtro.hidden = true; }
  }
  if (!signal.aborted) cargar();
}
