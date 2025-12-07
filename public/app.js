let token = null;
let lastModified = null;

// --- 1. Регистрация ---
async function register() {
  const nickname = document.getElementById("reg-nick").value.trim();
  const password = document.getElementById("reg-pass").value.trim();

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });

  const data = await res.json();
  alert(JSON.stringify(data, null, 2));
}

// --- 2. Вход ---
async function login() {
  const nickname = document.getElementById("login-nick").value.trim();
  const password = document.getElementById("login-pass").value.trim();

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });

  const data = await res.json();

  if (res.ok) {
    token = data.token;
    loadProfile(); 
  } else {
    alert(data.error || "Ошибка входа");
  }
}

// --- 3. Загрузка профиля ---
async function loadProfile() {
  if (!token) return logout();

  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) return logout();

  const data = await res.json();
  lastModified = res.headers.get("Last-Modified");

  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("profile-section").classList.remove("hidden");

  document.getElementById("user-role").innerText = data.role;
  document.getElementById("user-nick").innerText = data.nickname;
}

// --- 4. Обновление профиля (с If-Unmodified-Since) ---
async function updateProfile() {
  const res = await fetch("/api/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "If-Unmodified-Since": lastModified,
    },
    body: JSON.stringify({}), // Пустое тело, т.к. нет полей
  });

  if (res.status === 412) {
    alert("❌ Данные устарели. Перезагрузите профиль.");
    loadProfile(); // Обновить, чтобы получить свежую дату
    return;
  }

  if (res.ok) {
    alert("Updated!");
    lastModified = res.headers.get("Last-Modified");
    loadProfile();
  } else {
    const data = await res.json();
    alert(data.error);
  }
}

// --- 5. Удаление ---
async function deleteUser() {
  const userId = getUserIdFromToken();

  const res = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    alert("Удалено");
    logout();
  } else {
    const data = await res.json();
    alert(data.error);
  }
}

function logout() {
  token = null;
  lastModified = null;
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("profile-section").classList.add("hidden");
}

function getUserIdFromToken() {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId;
  } catch(e) {
    return null;
  }
}