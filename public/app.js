// Глобальные переменные
const API_URL = '/api';
let token = localStorage.getItem('token'); // Пытаемся достать токен из памяти браузера

// При загрузке страницы проверяем, есть ли токен
if (token) {
    showProfile();
}

// === 1. РЕГИСТРАЦИЯ ===
async function register() {
    const data = {
        nickname: document.getElementById('reg-nick').value,
        firstName: document.getElementById('reg-first').value,
        lastName: document.getElementById('reg-last').value,
        password: document.getElementById('reg-pass').value
    };

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
        alert('✅ Успешно! Теперь войдите.');
    } else {
        alert('❌ Ошибка: ' + (result.error || result.message));
    }
}

// === 2. ЛОГИН ===
async function login() {
    const nickname = document.getElementById('login-nick').value;
    const password = document.getElementById('login-pass').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
    });

    const data = await res.json();

    if (res.ok) {
        // Сохраняем токен в браузере
        token = data.token;
        localStorage.setItem('token', token);
        alert('✅ Вход выполнен! Токен получен.');
        showProfile();
    } else {
        alert('❌ Ошибка входа: ' + data.error);
    }
}

// === 3. ПОЛУЧЕНИЕ ПРОФИЛЯ (GET /api/me) ===
async function showProfile() {
    const res = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` // 🔥 Отправляем Токен
        }
    });

    if (res.ok) {
        const user = await res.json();
        
        // Показываем блок профиля, скрываем вход
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');

        // Заполняем данные
        document.getElementById('user-nick').innerText = user.nickname;
        document.getElementById('user-role').innerText = user.role;
        document.getElementById('edit-first').value = user.firstName;
        document.getElementById('edit-last').value = user.lastName;

        // 🔥 Сохраняем Last-Modified для защиты от конфликтов (Optimistic Locking)
        const lastModified = res.headers.get('Last-Modified');
        if (lastModified) {
            localStorage.setItem('lastModified', lastModified);
            console.log('Last-Modified saved:', lastModified);
        }

    } else {
        // Если токен протух (401), выходим
        logout();
    }
}

// === 4. ОБНОВЛЕНИЕ (PUT /api/update) + Проверка 412 ===
async function updateProfile() {
    const data = {
        firstName: document.getElementById('edit-first').value,
        lastName: document.getElementById('edit-last').value
    };

    // Достаем сохраненную дату
    const lastModified = localStorage.getItem('lastModified');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 🔥 Добавляем заголовок If-Unmodified-Since
    if (lastModified) {
        headers['If-Unmodified-Since'] = lastModified;
    }

    const res = await fetch(`${API_URL}/update`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (res.ok) {
        alert('✅ Профиль обновлен!');
        // Обновляем данные на странице и новую дату Last-Modified
        showProfile(); 
    } else if (res.status === 412) {
        alert('⚠️ КОНФЛИКТ! Данные устарели. Страница будет обновлена.');
        showProfile(); // Перезагружаем актуальные данные
    } else {
        const result = await res.json();
        alert('❌ Ошибка: ' + result.error);
    }
}

// === 5. УДАЛЕНИЕ (DELETE /api/users/:id) ===
async function deleteUser() {
    if (!confirm('Вы уверены? Это удалит ваш аккаунт.')) return;

    // Сначала нам нужно узнать свой ID (мы могли бы сохранить его при логине, но запросим через profile)
    // Для простоты в этом примере, предположим, что сервер сам понимает кого удалять по токену,
    // но в server.js у нас путь /api/users/:id.
    
    // Получим ID из профиля
    const profileRes = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await profileRes.json();
    const myId = user._id || user.id; // Mongo ID

    const res = await fetch(`${API_URL}/users/${myId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (res.ok) {
        alert('🗑️ Аккаунт удален.');
        logout();
    } else {
        alert('Ошибка удаления');
    }
}

// === ВЫХОД ===
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('lastModified');
    token = null;
    location.reload(); // Перезагружаем страницу
}