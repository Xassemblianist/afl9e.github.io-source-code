let isAdmin = false;

async function login() {
  const password = document.getElementById("adminPass").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.success) {
    isAdmin = true;
    alert("Admin giriş başarılı");
    loadHomeworks();
  } else {
    alert("Hatalı şifre");
  }
}

async function loadHomeworks() {
  const res = await fetch("/api/homeworks");
  const data = await res.json();
  const container = document.getElementById("homeworks");
  container.innerHTML = "";

  data.forEach(hw => {
    let emoji = "⚠️";
    if (hw.status === "verified") emoji = "✅";
    if (hw.status === "false") emoji = "❌";

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${hw.title}</h3>
      <p>${hw.description}</p>
      <p>${emoji}</p>
      ${hw.pdf ? `<a href="/uploads/${hw.pdf}" target="_blank">PDF</a>` : ""}
      ${isAdmin ? `
        <br>
        <button onclick="updateStatus('${hw.id}','verified')">Doğrula</button>
        <button onclick="updateStatus('${hw.id}','false')">Yanlış</button>
        <button onclick="deleteHW('${hw.id}')">Sil</button>
      ` : ""}
    `;

    container.appendChild(div);
  });
}

async function addHomework() {
  if (!isAdmin) return alert("Admin olmalısın");

  const formData = new FormData();
  formData.append("title", document.getElementById("title").value);
  formData.append("description", document.getElementById("desc").value);
  formData.append("pdf", document.getElementById("pdf").files[0]);

  await fetch("/api/homeworks", {
    method: "POST",
    body: formData
  });

  loadHomeworks();
}

async function updateStatus(id, status) {
  await fetch(`/api/homeworks/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  loadHomeworks();
}

async function deleteHW(id) {
  await fetch(`/api/homeworks/${id}`, { method: "DELETE" });
  loadHomeworks();
}

loadHomeworks();