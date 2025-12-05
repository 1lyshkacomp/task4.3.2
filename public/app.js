async function register() {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: r_nick.value,
      firstName: r_name.value,
      lastName: r_last.value,
      password: r_pass.value
    })
  });

  alert(await res.text());
}

let token = localStorage.getItem("token");

async function login() {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: l_nick.value,
      password: l_pass.value
    })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    alert("Вход успешен");
  } else {
    alert(data.error || "Ошибка");
  }
}
