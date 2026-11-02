// 1. Konfigurasi Supabase
const supabaseClient = window.KadoDigital.createSupabaseClient();

// Ambil ID secara aman menggunakan URLSearchParams murni
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id') ? urlParams.get('id').trim().toLowerCase() : '';


const form = document.getElementById("loginForm");
const card = document.getElementById("loginCard");
const button = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");
const backgroundLayer = document.getElementById("backgroundLayer");

function createLoginBackground() {
  const hearts = ["♡", "♥", "💕", "✨"];
  for (let i = 0; i < 28; i++) {
    const item = document.createElement("span");
    item.className = "float-item";
    item.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${Math.random() * 18 + 12}px`;
    item.style.animationDuration = `${Math.random() * 8 + 8}s`;
    item.style.animationDelay = `${Math.random() * 8}s`;
    backgroundLayer.appendChild(item);
  }
}

function showError(pesan) {
  errorMessage.textContent = pesan;
  errorMessage.classList.add("show");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  
  button.classList.remove("loading");
  button.disabled = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!orderId) {
    showError("Link kado tidak valid (ID tidak ditemukan).");
    return;
  }

  const usernameInput = document.getElementById("username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("password").value.trim();

  errorMessage.classList.remove("show");
  button.classList.add("loading");
  button.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .rpc('verify_kado_login', {
        p_id_kado: orderId,
        p_username: usernameInput,
        p_password: passwordInput
      })
      .single();

    if (error || !data?.success || !data?.access_token) {
      showError("Username atau password salah, atau kado belum aktif.");
      return;
    }

    sessionStorage.setItem("semesterCelebrationAccessToken", data.access_token);
    sessionStorage.setItem("semesterCelebrationOrderId", orderId);
    sessionStorage.setItem("semesterCelebrationPlayMusic", "true");

    setTimeout(() => {
      window.location.href = `loading.html?id=${encodeURIComponent(orderId)}`;
    }, 1200);

  } catch (err) {
    console.error("Login kado gagal:", err);
    showError("Terjadi kesalahan jaringan.");
  }
});

createLoginBackground();