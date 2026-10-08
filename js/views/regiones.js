import { h, icono, campo, entrada, seleccion, datosForm, conCarga, alerta, mostrarAlerta, modal, toast, chipEstado, skeletonLista, vacio, errorCarga } from '../ui.js';
import { api } from '../api.js';
import { puede } from '../app.js';

export async function render(cont, { signal }) {
  const editable = puede('regiones.guardar');
  const lista = h('div', { class: 'lista' });

  cont.append(
    h('div', { class: 'cab-vista' },
      h('div', {}, h('h1', {}, 'Regiones'), h('p', { class: 'sub' }, 'Regiones operativas de la Policía Estatal.')),
      editable ? h('button', { class: 'btn btn-pri btn-chico', type: 'button', onclick: () => abrir(null) }, icono('mas', 18), 'Nueva región') : null),
    lista);

  async function cargar() {
    lista.replaceChildren(skeletonLista(3));
    try {
      const r = await api('regiones.list');
      if (signal.aborted) return;
      lista.replaceChildren();
      if (!r.items.length) {
        lista.append(vacio('Aún no hay regiones. Crea la primera para poder asignar usuarios.',
          editable ? h('button', { class: 'btn btn-pri', type: 'button', onclick: () => abrir(null) }, 'Nueva región') : null));
      }
      r.items.forEach((x) => lista.append(h('article', { class: 'item' },
        h('div', { class: 'item-cab' }, h('strong', {}, x.nombre), chipEstado(x.estado)),
        h('div', { class: 'item-datos' }, h('span', {}, 'Clave ' + x.clave)),
        x.observaciones ? h('p', { class: 'item-nota' }, x.observaciones) : null,
        editable ? h('div', { class: 'item-acc' }, h('button', { class: 'btn btn-sec btn-chico', type: 'button', onclick: () => abrir(x) }, 'Editar')) : null)));
    } catch (e) {
      if (!signal.aborted) lista.replaceChildren(errorCarga(e, cargar));
    }
  }

  function abrir(x) {
    const aviso = alerta();
    const boton = h('button', { class: 'btn btn-pri', type: 'submit' }, x ? 'Guardar cambios' : 'Crear región');
    const form = h('form', { class: 'form', novalidate: true },
      campo('Nombre', entrada('nombre', { value: x ? x.nombre : '', maxlength: 80, required: true, placeholder: 'Ejemplo: Sureste' })),
      campo('Clave', entrada('clave', { value: x ? x.clave : '', maxlength: 20, required: true, placeholder: 'Ejemplo: SURESTE' }), 'Identificador corto y único.'),
      x ? campo('Estado', seleccion('estado', [{ valor: 'ACTIVO', etiqueta: 'Activa' }, { valor: 'INACTIVO', etiqueta: 'Inactiva' }], x.estado)) : null,
      campo('Observaciones', h('textarea', { name: 'observaciones', rows: 2, maxlength: 500 }, x ? x.observaciones : '')),
      aviso, h('div', { class: 'acciones' }, boton));
    const m = modal({ titulo: x ? 'Editar región' : 'Nueva región', contenido: form });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(form);
      if (!d.nombre || !d.clave) return mostrarAlerta(aviso, 'Nombre y clave son obligatorios.');
      await conCarga(boton, async () => {
        try {
          await api('regiones.guardar', Object.assign(d, x ? { region_id: x.region_id, version: x.version } : {}));
          m.cerrar(); toast(x ? 'Región actualizada.' : 'Región creada.', 'ok'); cargar();
        } catch (e) { mostrarAlerta(aviso, e.message); }
      }, 'Guardando…');
    });
  }

  cargar();
}
