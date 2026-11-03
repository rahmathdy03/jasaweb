// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const supabaseClient = window.KadoDigital.createSupabaseClient();

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
function isUsable(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined";
}

function cleanText(value, fallback = "") {
  return isUsable(value) ? String(value).trim() : fallback;
}

// Membaca rata-rata luminance foto background agar teks di atas foto
// otomatis berganti antara tema terang dan gelap.
function getAverageImageLuminance(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas tidak tersedia.');

        ctx.drawImage(img, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;

        let total = 0;
        let count = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3] / 255;
          if (alpha < 0.15) continue;

          // Perceived luminance (0 = hitam, 1 = putih).
          const r = pixels[i] / 255;
          const g = pixels[i + 1] / 255;
          const b = pixels[i + 2] / 255;
          total += (0.2126 * r + 0.7152 * g + 0.0722 * b) * alpha;
          count++;
        }

        if (!count) throw new Error('Foto tidak memiliki pixel yang bisa dianalisis.');
        resolve(total / count);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Foto background gagal dianalisis.'));
    img.src = imageUrl;
  });
}

async function applyAdaptiveSceneContrast(imageUrl) {
  document.body.classList.remove('scene-light', 'scene-dark');

  try {
    const luminance = await getAverageImageLuminance(imageUrl);

    // 0.60 dipilih agak konservatif: foto yang cukup terang langsung
    // menggunakan teks gelap agar tidak tenggelam pada area putih.
    const isLight = luminance >= 0.60;
    document.body.classList.add(isLight ? 'scene-light' : 'scene-dark');
    document.body.dataset.backgroundLuminance = luminance.toFixed(3);
  } catch (error) {
    console.warn('Gagal membaca kontras background, memakai mode gelap:', error);
    document.body.classList.add('scene-dark');
  }
}

function showTemplateError(title, message) {
  const wrapper = document.createElement('main');
  wrapper.className = 'deeptalk-error-screen';

  const card = document.createElement('section');
  card.className = 'deeptalk-error-card';

  const icon = document.createElement('div');
  icon.className = 'deeptalk-error-icon';
  icon.textContent = '♡';

  const heading = document.createElement('h1');
  heading.textContent = title;

  const copy = document.createElement('p');
  copy.textContent = message;

  card.append(icon, heading, copy);
  wrapper.appendChild(card);
  document.body.replaceChildren(wrapper);
}

function formatSpecialDate(value) {
  if (!isUsable(value)) return "Tanggal spesial kalian";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return cleanText(value);

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

async function initKado() {
  const urlParams = new URLSearchParams(window.location.search);
  const idKado = cleanText(urlParams.get('id')).toLowerCase();

  if (!idKado) {
    showTemplateError('Link kado tidak valid.', 'ID kado tidak ditemukan di URL.');
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .rpc('get_kado_by_id', { p_id_kado: idKado })
      .single();

    if (error || !data) throw error || new Error('Data kado tidak ditemukan.');

    if (data.template !== 'deeptalk-template') {
      showTemplateError('Template tidak cocok.', 'Link ini bukan untuk DeepTalk Night.');
      return false;
    }

    await window.KadoDigital.hydratePrivatePhotos(supabaseClient, data);
    dataKado = data;
    terapkanDataKeTemplate();
    return true;
  } catch (err) {
    console.error('Gagal memuat DeepTalk:', err);
    showTemplateError(
      'DeepTalk belum bisa dibuka.',
      'Pastikan link benar dan kado sudah diaktifkan oleh admin.'
    );
    return false;
  }
}

function terapkanDataKeTemplate() {
  if (!dataKado) return;

  if (isUsable(dataKado.link_foto_1)) {
    screens.opening.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("${String(dataKado.link_foto_1).trim()}")`;
    screens.opening.style.backgroundSize = 'cover';
    screens.opening.style.backgroundPosition = 'center center';
    screens.opening.style.backgroundRepeat = 'no-repeat';
    screens.opening.style.backgroundAttachment = 'scroll';
  }

  if (isUsable(dataKado.link_foto_2)) {
    const backgroundPhotoUrl = String(dataKado.link_foto_2).trim();

    document.body.style.backgroundImage = `url("${backgroundPhotoUrl}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    // Tidak perlu menunggu hasil analisis untuk merender template.
    // Begitu foto selesai dibaca, warna teks diperbarui otomatis.
    applyAdaptiveSceneContrast(backgroundPhotoUrl);
  } else {
    document.body.classList.add('scene-dark');
  }

  const namaPengirim = cleanText(dataKado.nama_pengirim, 'Aku');
  const namaPenerima = cleanText(dataKado.nama_penerima, 'Kamu');

  const heroNama1 = document.getElementById('heroNama1');
  const heroNama2 = document.getElementById('heroNama2');
  if (heroNama1) heroNama1.textContent = namaPengirim;
  if (heroNama2) heroNama2.textContent = namaPenerima;

  const wish1 = document.getElementById('wishRahmat');
  const wish2 = document.getElementById('wishFinka');
  if (wish1) wish1.placeholder = `Harapan ${namaPengirim}...`;
  if (wish2) wish2.placeholder = `Harapan ${namaPenerima}...`;

  const labels = document.querySelectorAll('.input-group label');
  if (labels[0]) labels[0].textContent = `Harapan ${namaPengirim}:`;
  if (labels[1]) labels[1].textContent = `Harapan ${namaPenerima}:`;

  const heroDate = document.getElementById('heroDate');
  const heroDuration = document.getElementById('heroDuration');

  if (heroDate) heroDate.textContent = formatSpecialDate(dataKado.tanggal_jadian);

  if (heroDuration) {
    if (isUsable(dataKado.tanggal_jadian)) {
      const targetDate = new Date(`${dataKado.tanggal_jadian}T00:00:00`);
      if (!Number.isNaN(targetDate.getTime())) {
        const diffTime = Math.max(0, Date.now() - targetDate.getTime());
        const diffDays = Math.floor(diffTime / 86400000);
        heroDuration.textContent = `Sudah bersama ${diffDays.toLocaleString('id-ID')} hari`;
      } else {
        heroDuration.textContent = 'Memulai lembaran baru...';
      }
    } else {
      heroDuration.textContent = 'Memulai lembaran baru...';
    }
  }

  if (bgm && isUsable(dataKado.link_musik)) {
    bgm.src = String(dataKado.link_musik).trim();
    bgm.load();
  }

  syncAudioUi();
}

function syncAudioUi() {
  const icon = document.getElementById('audio-icon');
  const button = document.getElementById('btn-audio');
  if (!icon || !button || !bgm) return;

  const hasAudio = Boolean(bgm.getAttribute('src'));
  button.disabled = !hasAudio;
  button.classList.toggle('audio-unavailable', !hasAudio);
  icon.textContent = bgm.paused ? '🎵' : '⏸️';
}

async function toggleAudio() {
  if (!bgm || !bgm.getAttribute('src')) return;

  try {
    if (bgm.paused) {
      bgm.volume = 0.4;
      await bgm.play();
    } else {
      bgm.pause();
    }
  } catch (error) {
    console.warn('Audio tidak bisa diputar:', error);
  }

  syncAudioUi();
}

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
  if (bgm && bgm.getAttribute('src')) {
    bgm.volume = 0.4;
    bgm.play().catch(() => {});
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
      transitionScreen.setAttribute('aria-hidden', 'false');
      void transitionScreen.offsetWidth;
      transitionScreen.classList.add('active');
      
      // Tunggu 2.5 detik untuk baca teks, lalu masuk ke kartu
      setTimeout(() => {
        transitionScreen.classList.remove('active');
        setTimeout(() => {
          transitionScreen.classList.add('hidden');
          transitionScreen.setAttribute('aria-hidden', 'true');
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
    console.error("Elemen #screen-game tidak ditemukan.");
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

  const content = String(text || "");
  element.replaceChildren();

  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  element.appendChild(cursor);

  let i = 0;
  clearInterval(typeInterval);
  isTyping = true;

  typeInterval = setInterval(() => {
    if (i < content.length) {
      cursor.before(document.createTextNode(content.charAt(i)));
      i += 1;
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
  if (event) event.stopPropagation();

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
  if (event) event.stopPropagation();
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
  const video = document.getElementById('videoElement');
  const status = document.getElementById('camera-status');
  if (!video) return;

  if (status) status.textContent = "Meminta izin kamera...";

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = cameraStream;
    if (status) status.textContent = "";
    switchScreen('wishlist', 'camera');
  } catch (err) {
    console.error("Kamera gagal diakses:", err);
    if (status) {
      status.textContent = "Kamera tidak bisa diakses. Izinkan kamera di browser lalu coba lagi.";
    }
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
  
  const nama1 = cleanText(dataKado?.nama_pengirim, "Aku");
  const nama2 = cleanText(dataKado?.nama_penerima, "Kamu");
  const wish1 = cleanText(document.getElementById('wishRahmat')?.value, "Semoga kita terus bertumbuh bersama.");
  const wish2 = cleanText(document.getElementById('wishFinka')?.value, "Semoga kita terus saling memilih.");

  const drawWrappedText = (text, x, y, maxWidth, lineHeight, maxLines = 2) => {
    const words = String(text).split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length >= maxLines - 1) break;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine && lines.length < maxLines) lines.push(currentLine);
    lines.slice(0, maxLines).forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight);
    });
  };

  const startTextY = 900;

  ctx.fillStyle = "#db2777";
  ctx.fillText(`✨ ${nama1}:`, 150, startTextY);
  ctx.fillStyle = "#4a044e";
  ctx.font = "italic 30px 'Plus Jakarta Sans', sans-serif";
  drawWrappedText(`"${wish1}"`, 150, startTextY + 45, 780, 38, 2);

  ctx.fillStyle = "#db2777";
  ctx.font = "bold 34px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`✨ ${nama2}:`, 150, startTextY + 145);
  ctx.fillStyle = "#4a044e";
  ctx.font = "italic 30px 'Plus Jakarta Sans', sans-serif";
  drawWrappedText(`"${wish2}"`, 150, startTextY + 190, 780, 38, 2);

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
  particle.textContent = '🤍'; 
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
  styleEl.textContent = `@keyframes ripple { to { transform: scale(4); opacity: 0; } }`;
  document.head.appendChild(styleEl);
}

function bindKeyboardAction(element, action) {
  if (!element) return;

  element.addEventListener('click', action);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action(event);
    }
  });
}

function setupDeepTalkControls() {
  document.getElementById('btn-audio')?.addEventListener('click', toggleAudio);
  document.getElementById('btn-start-game')?.addEventListener('click', startPremiumGame);
  document.getElementById('btnNext')?.addEventListener('click', nextCard);
  document.getElementById('btn-modal-done')?.addEventListener('click', closeModalAndProceed);
  document.getElementById('btn-open-camera')?.addEventListener('click', startCamera);
  document.getElementById('btn-take-photo')?.addEventListener('click', takePhoto);

  bindKeyboardAction(document.getElementById('question-card'), flipCard);

  if (bgm) {
    bgm.addEventListener('play', syncAudioUi);
    bgm.addEventListener('pause', syncAudioUi);
  }
}

async function bootstrapDeepTalk() {
  const loaded = await initKado();
  if (!loaded) return;

  setupDeepTalkControls();
  updateCardUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapDeepTalk);
} else {
  bootstrapDeepTalk();
}
