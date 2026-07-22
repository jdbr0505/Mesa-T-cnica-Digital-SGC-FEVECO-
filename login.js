const VALID_USER = 'admin';
const VALID_PASS = 'FEVECO2024';

const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const btnText = document.querySelector('.btn-text');
const btnSpinner = document.querySelector('.btn-spinner');
const submitBtn = document.querySelector('.login-btn');

togglePassword.addEventListener('click', function () {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    this.querySelector('.eye-open').classList.toggle('hidden');
    this.querySelector('.eye-closed').classList.toggle('hidden');
    this.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

function mostrarToast(mensaje, tipo) {
    const container = document.getElementById('toast-container');
    const icons = {
        success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `${icons[tipo] || icons.info}<span>${mensaje}</span><button class="toast-close">&times;</button>`;
    container.appendChild(toast);
    toast.querySelector('.toast-close').onclick = () => removerToast(toast);
    setTimeout(() => removerToast(toast), 4000);
}

function removerToast(toast) {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
}

function setLoading(loading) {
    if (loading) {
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        submitBtn.disabled = true;
    } else {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function validarCredenciales(user, pass) {
    return user.trim() === VALID_USER && pass === VALID_PASS;
}

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const user = username.value.trim();
    const pass = password.value;

    if (!user || !pass) {
        mostrarToast('Por favor, complete todos los campos.', 'warning');
        return;
    }

    setLoading(true);

    setTimeout(() => {
        if (validarCredenciales(user, pass)) {
            mostrarToast('Inicio de sesión exitoso. Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = 'sistema_coleo.html';
            }, 800);
        } else {
            mostrarToast('Usuario o contraseña incorrectos.', 'error');
            setLoading(false);
            username.focus();
            username.select();
        }
    }, 1000);
});

username.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') password.focus();
});
