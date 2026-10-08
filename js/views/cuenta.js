import { h, icono, campo, entradaPassword, datosForm, conCarga, alerta, mostrarAlerta, toast, logoCoahuila, ROLES } from '../ui.js';
import { api } from '../api.js';
import { estado, cargarBoot, cerrarSesion, ir } from '../app.js';
import { CONFIG } from '../config.js';

export function render(cont) {
  const b = estado.boot;
  const u = b.usuario;
  const n = b.ambito_nombres || {};
  const forzado = u.debe_cambiar_pass;

  const aviso = alerta();
  const boton = h('button', { class: 'btn btn-pri', type: 'submit' }, 'Cambiar contraseña');
  const form = h('form', { class: 'form', novalidate: true },
    campo(forzado ? 'Contraseña temporal' : 'Contraseña actual', entradaPassword('actual', 'current-password')),
    campo('Nueva contraseña', entradaPassword('nueva', 'new-password'), 'Mínimo 8 caracteres, con letras y números.'),
    campo('Confirmar nueva contraseña', entradaPassword('confirmar', 'new-password')),
    aviso,
    h('div', { class: 'acciones' }, boton));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = datosForm(form);
    if (!d.actual || !d.nueva) return mostrarAlerta(aviso, 'Completa todos los campos.');
    if (d.nueva.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(d.nueva) || !/\d/.test(d.nueva)) {
      return mostrarAlerta(aviso, 'La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
    }
    if (d.nueva !== d.confirmar) return mostrarAlerta(aviso, 'Las contraseñas nuevas no coinciden.');
    await conCarga(boton, async () => {
      try {
        await api('auth.cambiarPassword', { actual: d.actual, nueva: d.nueva }, { timeout: 45000 });
        toast('Contraseña actualizada.', 'ok');
        form.reset();
        await cargarBoot({ esperar: true });
        if (forzado) ir('inicio');
      } catch (e) { mostrarAlerta(aviso, e.message); }
    }, 'Guardando…');
  });

  const salir = h('button', { class: 'btn btn-sec btn-bloque', type: 'button' }, icono('salir', 18), 'Cerrar sesión');
  salir.addEventListener('click', () => conCarga(salir, cerrarSesion, 'Cerrando…'));

  cont.append(
    h('div', { class: 'cab-vista' }, h('div', {}, h('h1', {}, 'Mi cuenta'))),
    forzado ? h('p', { class: 'alerta alerta-aviso' }, 'Por seguridad, cambia la contraseña temporal antes de continuar.') : null,
    h('section', { class: 'panel' },
      h('dl', { class: 'datos' },
        h('dt', {}, 'Nombre'), h('dd', {}, u.nombre_completo),
        h('dt', {}, 'Teléfono'), h('dd', {}, u.telefono),
        u.cargo ? [h('dt', {}, 'Cargo'), h('dd', {}, u.cargo)] : null,
        h('dt', {}, 'Tipo de usuario'), h('dd', {}, ROLES[u.rol]),
        n.region ? [h('dt', {}, 'Región'), h('dd', {}, n.region)] : null,
        n.agrupamiento ? [h('dt', {}, 'Agrupamiento'), h('dd', {}, n.agrupamiento)] : null)),
    h('section', { class: 'panel' }, h('h2', {}, 'Cambiar contraseña'), form),
    forzado ? null : h('section', { class: 'panel' },
      h('p', { class: 'nota' }, 'Tu sesión permanece abierta en este dispositivo hasta que la cierres.'),
      salir),
    h('footer', { class: 'pie' }, logoCoahuila(), h('small', {}, 'Versión ' + CONFIG.VERSION))
  );
}
