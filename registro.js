const form = document.getElementById('registroForm');
const nombre = document.getElementById('nombre');
const email = document.getElementById('email');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regConfirm = document.getElementById('regConfirm');
const btnText = document.querySelector('.btn-text');
const btnSpinner = document.querySelector('.btn-spinner');
const submitBtn = document.querySelector('.reg-btn');

document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.querySelector('.eye-open').classList.toggle('hidden');
        this.querySelector('.eye-closed').classList.toggle('hidden');
        this.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
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

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nombreVal = nombre.value.trim();
    const emailVal = email.value.trim();
    const userVal = regUsername.value.trim();
    const passVal = regPassword.value;
    const confirmVal = regConfirm.value;

    if (!nombreVal || !emailVal || !userVal || !passVal || !confirmVal) {
        mostrarToast('Por favor, complete todos los campos.', 'warning');
        return;
    }

    if (!emailVal.includes('@') || !emailVal.includes('.')) {
        mostrarToast('Ingrese un correo electrónico válido.', 'warning');
        return;
    }

    if (passVal.length < 8) {
        mostrarToast('La contraseña debe tener al menos 8 caracteres.', 'warning');
        return;
    }

    if (passVal !== confirmVal) {
        mostrarToast('Las contraseñas no coinciden.', 'error');
        return;
    }

    setLoading(true);

    setTimeout(() => {
        mostrarToast('Cuenta creada exitosamente. Redirigiendo al inicio de sesión...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }, 1000);
});

regPassword.addEventListener('input', function () {
    if (regConfirm.value && this.value !== regConfirm.value) {
        regConfirm.style.borderColor = 'var(--reg-accent)';
    }
});

regConfirm.addEventListener('input', function () {
    if (this.value && this.value !== regPassword.value) {
        this.style.borderColor = '#ef4444';
    } else if (this.value) {
        this.style.borderColor = 'var(--reg-accent)';
    } else {
        this.style.borderColor = '';
    }
});
