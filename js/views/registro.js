import { h, campo, entrada, entradaPassword, datosForm, conCarga, alerta, mostrarAlerta, cabeceraAuth, logoCoahuila } from '../ui.js';
import { api } from '../api.js';

export function render(cont) {
  const aviso = alerta();
  const boton = h('button', { class: 'btn btn-pri btn-bloque', type: 'submit' }, 'Enviar solicitud');
  const form = h('form', { class: 'form', novalidate: true },
    h('fieldset', {},
      h('legend', {}, 'Tus datos'),
      campo('Nombre(s)', entrada('nombre', { autocomplete: 'given-name', maxlength: 80, required: true })),
      h('div', { class: 'fila2' },
        campo('Apellido paterno', entrada('apellido_paterno', { maxlength: 80, required: true })),
        campo('Apellido materno', entrada('apellido_materno', { maxlength: 80 }))),
      h('div', { class: 'fila2' },
        campo('Número de empleado', entrada('numero_empleado', { maxlength: 30, inputmode: 'numeric' })),
        campo('Cargo', entrada('cargo', { maxlength: 80 }))),
      campo('Adscripción', h('textarea', { name: 'adscripcion_declarada', rows: 2, maxlength: 160, required: true, placeholder: 'Ejemplo: Región Sureste, Agrupamiento de Reacción' }),
        'El administrador confirma tu región y agrupamiento antes de darte acceso.')
    ),
    h('fieldset', {},
      h('legend', {}, 'Acceso'),
      campo('Teléfono celular', entrada('telefono', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: 16, required: true, placeholder: '10 dígitos' }),
        'Con este número iniciarás sesión.'),
      campo('Contraseña', entradaPassword('password', 'new-password'), 'Mínimo 8 caracteres, con letras y números.'),
      campo('Confirmar contraseña', entradaPassword('confirmar', 'new-password'))
    ),
    aviso,
    boton
  );

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    aviso.hidden = true;
    const d = datosForm(form);
    const tel = d.telefono.replace(/\D/g, '');
    if (!d.nombre || !d.apellido_paterno || !d.adscripcion_declarada) return mostrarAlerta(aviso, 'Completa nombre, apellido paterno y adscripción.');
    if (tel.length < 10) return mostrarAlerta(aviso, 'El teléfono debe tener 10 dígitos.');
    if (d.password.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(d.password) || !/\d/.test(d.password)) {
      return mostrarAlerta(aviso, 'La contraseña debe tener al menos 8 caracteres, con letras y números.');
    }
    if (d.password !== d.confirmar) return mostrarAlerta(aviso, 'Las contraseñas no coinciden.');
    delete d.confirmar;

    await conCarga(boton, async () => {
      try {
        const r = await api('auth.registro', d, { timeout: 45000 });
        cont.replaceChildren(h('div', { class: 'auth' },
          cabeceraAuth(),
          h('h1', {}, 'Solicitud enviada'),
          h('p', { class: 'alerta alerta-ok' }, r.mensaje),
          h('p', {}, 'Cuando el administrador valide tu información podrás entrar con tu teléfono y contraseña.'),
          h('a', { class: 'btn btn-pri btn-bloque', href: '#/login' }, 'Ir a iniciar sesión'),
          logoCoahuila()
        ));
      } catch (e) {
        mostrarAlerta(aviso, e.message);
      }
    }, 'Enviando…');
  });

  cont.append(h('div', { class: 'auth auth-ancho' },
    cabeceraAuth(),
    h('h1', {}, 'Solicitar acceso'),
    h('p', { class: 'auth-sub' }, 'Registra tus datos. Tu cuenta quedará pendiente hasta que el administrador la valide y te asigne permisos.'),
    form,
    h('p', { class: 'auth-alt' }, '¿Ya tienes cuenta? ', h('a', { href: '#/login' }, 'Iniciar sesión')),
    logoCoahuila()
  ));
}
