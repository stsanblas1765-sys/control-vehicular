import { h, campo, entrada, entradaPassword, datosForm, conCarga, alerta, mostrarAlerta, cabeceraAuth, logoCoahuila } from '../ui.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { alIniciarSesion } from '../app.js';

export function render(cont) {
  const aviso = alerta();
  const boton = h('button', { class: 'btn btn-pri btn-bloque', type: 'submit' }, 'Iniciar sesión');
  const form = h('form', { class: 'form', novalidate: true },
    campo('Teléfono o usuario', entrada('telefono', { type: 'tel', inputmode: 'numeric', autocomplete: 'username', maxlength: 16, required: true, placeholder: 'Tu teléfono de 10 dígitos' })),
    campo('Contraseña', entradaPassword('password', 'current-password')),
    aviso,
    boton
  );

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    aviso.hidden = true;
    const d = datosForm(form);
    if (d.telefono.replace(/\D/g, '').length < 4 || !d.password) {
      return mostrarAlerta(aviso, 'Escribe tu teléfono (o usuario) y tu contraseña.');
    }
    await conCarga(boton, async () => {
      try {
        const r = await api('auth.login', { telefono: d.telefono, password: d.password });
        auth.guardar(r.token);
        await alIniciarSesion();
      } catch (e) {
        const tipo = e.codigo === 'PENDIENTE' ? 'info' : (e.codigo === 'BLOQUEADO' || e.codigo === 'RECHAZADO' ? 'aviso' : 'error');
        mostrarAlerta(aviso, e.message, tipo);
      }
    }, 'Entrando…');
  });

  cont.append(h('div', { class: 'auth' },
    cabeceraAuth('Policía Estatal de Coahuila'),
    h('h1', {}, 'Iniciar sesión'),
    form,
    h('p', { class: 'auth-alt' }, '¿Aún no tienes cuenta? ', h('a', { href: '#/registro' }, 'Solicitar acceso')),
    logoCoahuila()
  ));
}
