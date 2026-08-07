// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel Global
let dataKado = null;
let currentQuestionIndex = 0;
let cameraStream = null;

const bgm = document.getElementById('bgm');
const screens = {
  opening: document.getElementById('screen-opening'),
  game: document.getElementById('screen-game'),
  wishlist: document.getElementById('screen-wishlist'),
  camera: document.getElementById('screen-camera'),
  result: document.getElementById('screen-result')
};

// ==========================================
// 2. FUNGSI INISIALISASI & DATA PASANGAN
// ==========================================
async function initKado() {
  const urlParams = new URLSearchParams(window.location.search);
  const idKado = urlParams.get('id');

  if (!idKado) {
    alert("ID Kado tidak ditemukan! Buka melalui link yang valid.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('pesanan')
      .select('*')
      .eq('id_kado', idKado)
      .single();

    if (error) throw error;
    
    if (data.status === 'pending') {
      document.body.innerHTML = "<h2 style='text-align:center; margin-top:20vh; color:white;'>Kado ini belum diaktifkan. Silakan hubungi admin.</h2>";
      return;
    }

    dataKado = data;
    terapkanDataKeTemplate();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = "<h2 style='text-align:center; margin-top:20vh; color:white;'>Kado tidak ditemukan atau link salah.</h2>";
  }
}

function terapkanDataKeTemplate() {
  // 1. Background Opening (Anti-Terpotong)
  if (dataKado.link_foto_1) {
    screens.opening.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${dataKado.link_foto_1}')`;
    screens.opening.style.backgroundSize = 'cover';
    screens.opening.style.backgroundPosition = 'center center';
    screens.opening.style.backgroundRepeat = 'no-repeat';
    screens.opening.style.backgroundAttachment = 'scroll'; // Mencegah bug di iOS
  }
  
  // 2. Background Main Game
  if (dataKado.link_foto_2) {
    document.body.style.backgroundImage = `url('${dataKado.link_foto_2}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  }
  
  // ... (sisanya biarkan sama seperti sebelumnya) ...

  // Teks Nama Pasangan & Wishlist
  if (dataKado.nama_pengirim && dataKado.nama_penerima) {
    // Di Halaman Pembuka (Hero)
    const heroNama1 = document.getElementById('heroNama1');
    const heroNama2 = document.getElementById('heroNama2');
    if(heroNama1) heroNama1.innerText = dataKado.nama_pengirim;
    if(heroNama2) heroNama2.innerText = dataKado.nama_penerima;

    // Di Halaman Wishlist
    const wRahmat = document.getElementById('wishRahmat');
    const wFinka = document.getElementById('wishFinka');
    if(wRahmat) wRahmat.placeholder = `Harapan ${dataKado.nama_pengirim}...`;
    if(wFinka) wFinka.placeholder = `Harapan ${dataKado.nama_penerima}...`;
    
    const textareas = document.querySelectorAll('.input-group textarea');
    if (textareas.length >= 2) {
      textareas[0].previousElementSibling.innerText = `Harapan ${dataKado.nama_pengirim}:`;
      textareas[1].previousElementSibling.innerText = `Harapan ${dataKado.nama_penerima}:`;
    }
  }

// Hitung Durasi Bersama secara Dinamis dari Database
  const heroDuration = document.getElementById('heroDuration');
  const heroDate = document.getElementById('heroDate'); // Tambahkan ID ini di HTML jika ingin ubah teks tanggalnya juga
  
  if (heroDuration && dataKado.tanggal_jadian) {
    // Tampilkan teks tanggal aslinya (opsional, jika kamu buat elemen id="heroDate" di HTML)
    if (heroDate) {
      // Format tanggal sederhana (YYYY-MM-DD)
      heroDate.innerText = dataKado.tanggal_jadian; 
    }

    // Kalkulasi hitung hari
    const targetDate = new Date(dataKado.tanggal_jadian); 
    const today = new Date();
    const diffTime = Math.abs(today - targetDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    
    heroDuration.innerText = `Sudah bersama ${diffDays} hari`;
  } else if (heroDuration) {
    // Fallback jika tidak ada data tanggal yang diinput
    heroDuration.innerText = `Memulai lembaran baru...`;
  }
}

initKado();

// ==========================================
// 3. FITUR PREMIUM: HERO TRANSISI & AUDIO (ANTI-CRASH)
// ==========================================
function startPremiumGame(event) {
  // 1. Jalankan efek ripple hanya jika event tersedia (Mencegah error)
  if (event) {
    try {
      createRipple(event);
    } catch(e) {
      console.log("Efek ripple dilewati");
    }
  }
  
  // 2. Play Musik
  if(bgm) {
    bgm.volume = 0.4; 
    bgm.play().catch(e => console.log("Audio autoplay dicegah"));
    const icon = document.getElementById('audio-icon');
    if (icon) icon.innerText = "⏸️";
  }

  // 3. Efek mengecil pada kartu hero
  const heroCard = document.getElementById('hero-card');
  if (heroCard) {
    heroCard.style.transform = 'scale(0.9)';
    heroCard.style.opacity = '0';
  }

  // 4. Proses Pindah Layar
  setTimeout(() => {
    // Sembunyikan layar awal
    const screenOpening = document.getElementById('screen-opening');
    if (screenOpening) {
      screenOpening.classList.remove('active');
      screenOpening.classList.add('hidden');
    }
    
    // Cari layar transisi
    const transitionScreen = document.getElementById('screen-transition');
    
    // JIKA LAYAR TRANSISI ADA DI HTML
    if (transitionScreen) {
      transitionScreen.classList.remove('hidden');
      void transitionScreen.offsetWidth; 
      transitionScreen.classList.add('active');
      
      // Tunggu 2.5 detik untuk baca teks, lalu masuk ke kartu
      setTimeout(() => {
        transitionScreen.classList.remove('active');
        setTimeout(() => {
          transitionScreen.classList.add('hidden');
          masukKeKartuDeepTalk();
        }, 800); 
      }, 2500);
    } 
    // JIKA LAYAR TRANSISI TIDAK ADA DI HTML (FALLBACK AMAN)
    else {
      console.log("Layar transisi tidak ditemukan, langsung menuju game...");
      masukKeKartuDeepTalk();
    }
  }, 400);
}

// Fungsi Bantuan untuk Memunculkan Kartu Game
function masukKeKartuDeepTalk() {
  updateCardUI();
  const screenGame = document.getElementById('screen-game');
  if (screenGame) {
    screenGame.classList.remove('hidden');
    screenGame.classList.add('active');
  } else {
    alert("Error: Elemen #screen-game tidak ditemukan di HTML!");
  }
}

// Fungsi Efek Ripple (Gelombang Sentuhan) yang Diperbaiki
function createRipple(event) {
  const button = event.currentTarget;
  if (!button) return; // Mencegah error jika target tidak ditemukan
  
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  
  // Menggunakan getBoundingClientRect agar posisi selalu akurat
  const rect = button.getBoundingClientRect();
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.background = 'rgba(255, 255, 255, 0.4)';
  circle.style.transform = 'scale(0)';
  circle.style.animation = 'ripple 0.6s linear';
  circle.style.pointerEvents = 'none';

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

// ==========================================
// 4. LOGIKA KARTU DEEPTALK & MESIN KETIK
// ==========================================
function switchScreen(hideId, showId) {
  if(!screens[hideId] || !screens[showId]) return;
  screens[hideId].classList.remove('active');
  screens[hideId].classList.add('hidden');
  setTimeout(() => {
    screens[showId].classList.remove('hidden');
    screens[showId].classList.add('active');
  }, 800);
}

let typeInterval;
let isTyping = false;

function typeWriter(text, elementId, speed = 40) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  text = text || ""; 
  element.innerHTML = '<span class="typing-cursor"></span>';
  const cursor = element.querySelector('.typing-cursor');
  if (!cursor) return;
  
  let i = 0;
  clearInterval(typeInterval); 
  isTyping = true;
  
  typeInterval = setInterval(() => {
    if (i < text.length) {
      cursor.insertAdjacentText('beforebegin', text.charAt(i));
      i++;
    } else {
      clearInterval(typeInterval);
      isTyping = false;
      cursor.classList.remove('typing-cursor'); 
    }
  }, speed);
}

function flipCard() {
  const card = document.getElementById('activeCard');
  if (!card) return;
  
  const isFlipped = card.classList.toggle('is-flipped'); 
  if (typeof deepQuestions === 'undefined' || !deepQuestions[currentQuestionIndex]) return;
  
  const currentData = deepQuestions[currentQuestionIndex];
  const textEl = document.getElementById('questionText');
  const actionEl = document.getElementById('actionMessage');
  
  if (isFlipped) {
    setTimeout(() => {
      typeWriter(currentData.text, 'questionText', 50); 
      if(actionEl) actionEl.innerText = currentData.action || "";
    }, 300);
  } else {
    clearInterval(typeInterval);
    if(actionEl) actionEl.innerText = "";
    if(textEl) textEl.innerText = "Menunggu hatimu...";
  }
}

function updateCardUI() {
  if (typeof deepQuestions === 'undefined' || !deepQuestions[currentQuestionIndex]) return;
  
  const counterEl = document.getElementById('counter');
  const textEl = document.getElementById('questionText');
  const actionEl = document.getElementById('actionMessage');
  
  if(counterEl) counterEl.innerText = `Pertanyaan ${currentQuestionIndex + 1} dari ${deepQuestions.length}`;
  if(textEl) textEl.innerText = "Menunggu hatimu..."; 
  if(actionEl) actionEl.innerText = ""; 
}

// ==========================================
// 5. LOGIKA POP-UP SYARAT ROMANTIS
// ==========================================
function nextCard(event) {
  let evt = event || window.event;
  if (evt) {
    evt.stopPropagation();
    evt.cancelBubble = true;
  }

  const card = document.getElementById('activeCard');
  if (!card) return;

  if (card.classList.contains('is-flipped')) {
    const currentData = deepQuestions[currentQuestionIndex];
    if (currentData && currentData.action) {
      document.getElementById('modalActionText').innerText = currentData.action;
      document.getElementById('actionModal').classList.add('show-modal');
    } else {
      proceedAndFlipBack();
    }
  } else {
    console.log("Balik dulu kartunya untuk membaca pertanyaan");
  }
}

function closeModalAndProceed(event) {
  let evt = event || window.event;
  if (evt) {
    evt.stopPropagation();
  }
  document.getElementById('actionModal').classList.remove('show-modal');
  setTimeout(() => {
    proceedAndFlipBack();
  }, 400);
}

function proceedAndFlipBack() {
  const card = document.getElementById('activeCard');
  if (card) card.classList.remove('is-flipped');
  clearInterval(typeInterval); 
  setTimeout(() => {
    proceedToNextQuestion();
  }, 400); 
}

function proceedToNextQuestion() {
  currentQuestionIndex++;
  if (typeof deepQuestions !== 'undefined' && currentQuestionIndex >= deepQuestions.length) {
    switchScreen('game', 'wishlist');
  } else {
    updateCardUI();
  }
}

// ==========================================
// 6. KAMERA & KANVAS PINK PASTEL
// ==========================================
setInterval(() => {
  const d = new Date();
  const clockEl = document.getElementById('clock');
  if(clockEl) clockEl.innerText = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}, 1000);

async function startCamera() {
  switchScreen('wishlist', 'camera');
  const video = document.getElementById('videoElement');
  if(!video) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = cameraStream;
  } catch (err) {
    alert("Kamera gagal diakses. Pastikan memberi izin browser.");
  }
}

function takePhoto() {
  const canvas = document.getElementById('resultCanvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('videoElement');
  if(!canvas || !ctx || !video) return;
  
  // Ukuran kanvas HD Portrait
  canvas.width = 1080; 
  canvas.height = 1350;

  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, "#ffe4e6"); 
  bgGradient.addColorStop(0.5, "#fbcfe8"); 
  bgGradient.addColorStop(1, "#f472b6"); 
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.fillStyle = "#ffffff"; 
  ctx.shadowColor = "rgba(244, 114, 182, 0.3)";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.roundRect(80, 70, 920, 1210, 40);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#db2777"; 
  ctx.font = "bold 44px 'Playfair Display', serif";
  ctx.textAlign = "center";
  ctx.fillText("💕 Our DeepTalk & Wishlist 💕", canvas.width/2, 140);

  const photoX = 140;
  const photoY = 180;
  const photoW = 800;
  const photoH = 640;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#fff1f2"; 
  ctx.beginPath();
  ctx.roundRect(photoX - 15, photoY - 15, photoW + 30, photoH + 30, 24);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 16);
  ctx.clip();
  ctx.drawImage(video, photoX, photoY, photoW, photoH);
  ctx.restore();

  ctx.fillStyle = "#831843"; 
  ctx.font = "bold 34px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "left";
  
  const nama1 = dataKado ? dataKado.nama_pengirim : "Rahmat";
  const nama2 = dataKado ? dataKado.nama_penerima : "Finka";
  const wRahmat = document.getElementById('wishRahmat') ? document.getElementById('wishRahmat').value : "Berbahagia selalu.";
  const wFinka = document.getElementById('wishFinka') ? document.getElementById('wishFinka').value : "Bersama selamanya.";

  let startTextY = 900;

  ctx.fillStyle = "#db2777";
  ctx.fillText(`✨ ${nama1}:`, 150, startTextY);
  ctx.fillStyle = "#4a044e";
  ctx.font = "italic 30px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`"${wRahmat}"`, 150, startTextY + 45);

  ctx.fillStyle = "#db2777";
  ctx.font = "bold 34px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`✨ ${nama2}:`, 150, startTextY + 120);
  ctx.fillStyle = "#4a044e";
  ctx.font = "italic 30px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`"${wFinka}"`, 150, startTextY + 165);

  ctx.fillStyle = "#f43f5e";
  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("💖 🌸 💖 🌸 💖", canvas.width/2, 1240);

  if(cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  
  const finalImage = document.getElementById('finalImage');
  const downloadLink = document.getElementById('downloadLink');
  
  if(finalImage && downloadLink) {
    finalImage.src = canvas.toDataURL('image/png');
    downloadLink.href = finalImage.src;
  }
  
  switchScreen('camera', 'result');
}

// ==========================================
// 7. EFEK VISUAL (PARTIKEL & HATI)
// ==========================================
function createHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  
  for (let i = 0; i < 15; i++) {
    let petal = document.createElement('div');
    petal.classList.add('hero-particle', 'petal');
    petal.style.width = `${Math.random() * 8 + 4}px`;
    petal.style.height = `${Math.random() * 8 + 4}px`;
    petal.style.left = `${Math.random() * 100}vw`;
    petal.style.animationDuration = `${Math.random() * 10 + 10}s`;
    petal.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(petal);
  }

  for (let i = 0; i < 25; i++) {
    let dust = document.createElement('div');
    dust.classList.add('hero-particle', 'dust');
    let size = Math.random() * 4 + 1;
    dust.style.width = `${size}px`;
    dust.style.height = `${size}px`;
    dust.style.left = `${Math.random() * 100}vw`;
    dust.style.animationDuration = `${Math.random() * 15 + 10}s`;
    dust.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(dust);
  }
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  for (let i = 0; i < 40; i++) {
    let particle = document.createElement('div');
    particle.classList.add('particle');
    let size = Math.random() * 5 + 2; 
    let posX = Math.random() * 100; 
    let delay = Math.random() * 10; 
    let duration = Math.random() * 15 + 10; 
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}vw`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    container.appendChild(particle);
  }
}

createHeroParticles();
createParticles();

document.addEventListener('click', function(e) {
  const particle = document.createElement('div');
  particle.innerHTML = '🤍'; 
  particle.className = 'click-particle';
  particle.style.left = e.clientX + 'px';
  particle.style.top = e.clientY + 'px';
  document.body.appendChild(particle);
  
  setTimeout(() => {
    particle.remove();
  }, 1000);
});

// Tambahkan CSS Transisi via JS jika belum ada
// Bagian ini sudah diperbaiki (tidak ada redeklasrasi variabel 'style')
if (!document.getElementById('ripple-style')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'ripple-style';
  styleEl.innerHTML = `@keyframes ripple { to { transform: scale(4); opacity: 0; } }`;
  document.head.appendChild(styleEl);
}