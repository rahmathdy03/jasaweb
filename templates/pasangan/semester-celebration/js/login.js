// 1. Konfigurasi Supabase
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil ID secara aman menggunakan URLSearchParams murni
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id') ? urlParams.get('id').trim().toLowerCase() : '';

console.log("ID Bersih yang terbaca:", orderId);

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
  errorMessage.innerText = pesan;
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
  const passwordInput = document.getElementById("password").value.trim().toLowerCase();

  errorMessage.classList.remove("show");
  button.classList.add("loading");
  button.disabled = true;

  try {
    // Mencari data di database berdasarkan ID yang ada di URL secara dinamis
    const { data, error } = await supabaseClient
      .from('pesanan')
      .select('nama_pengirim, nama_penerima, status')
      .eq('id_kado', orderId)
      .single();

    if (error || !data) {
      showError("Kado tidak ditemukan di sistem.");
      return;
    }

    if (data.status === 'pending') {
      showError("Kado ini belum diaktifkan oleh Admin.");
      return;
    }

    // Mencocokkan input dengan nama pengirim dan penerima di baris data tersebut
    if (usernameInput === data.nama_pengirim.toLowerCase() && 
        passwordInput === data.nama_penerima.toLowerCase()) {
      
      localStorage.setItem("semesterCelebrationLoggedIn", "true");
      localStorage.setItem("semesterCelebrationPlayMusic", "true");

      setTimeout(() => {
        window.location.href = `loading.html?id=${orderId}`; 
      }, 1200);
    } else {
      showError("Username atau password salah."); 
    }

  } catch (err) {
    showError("Terjadi kesalahan jaringan.");
  }
});

createLoginBackground();