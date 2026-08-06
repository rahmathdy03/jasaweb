const magicLayer = document.getElementById("backgroundMagic");
const heroTyping = document.getElementById("heroTyping");
const envelope = document.getElementById("envelope");
const letterPaper = document.getElementById("letterPaper");
const letterTyping = document.getElementById("letterTyping");
const rewardButton = document.getElementById("claimReward");
const rewardPopup = document.getElementById("rewardPopup");
const closePopup = document.getElementById("closePopup");
const bgMusic = document.getElementById("bgMusic");
const playMusic = document.getElementById("playMusic");
const pauseMusic = document.getElementById("pauseMusic");
const volumeMusic = document.getElementById("volumeMusic");

if (localStorage.getItem("semesterCelebrationLoggedIn") !== "true") {
  window.location.href = "index.html";
}

// Konfigurasi Supabase Client
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let heroText = "";
let loveLetter = "";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function typeText(element, text, speed = 38) {
  return new Promise(resolve => {
    element.textContent = "";
    let index = 0;

    const timer = setInterval(() => {
      element.textContent += text[index];
      index++;

      if (index >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

function createMagicBackground() {
  const symbols = ["♡", "♥", "💕", "🌸", "✨"];

  for (let i = 0; i < 38; i++) {
    const item = document.createElement("span");
    item.className = "magic-item";
    item.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${Math.random() * 20 + 13}px`;
    item.style.animationDuration = `${Math.random() * 9 + 9}s`;
    item.style.animationDelay = `${Math.random() * 10}s`;
    magicLayer.appendChild(item);
  }

  for (let i = 0; i < 55; i++) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 100}%`;
    sparkle.style.animationDelay = `${Math.random() * 3}s`;
    magicLayer.appendChild(sparkle);
  }

  for (let i = 0; i < 24; i++) {
    const bubble = document.createElement("span");
    const size = Math.random() * 68 + 20;
    bubble.className = "bubble";
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.bottom = `-${size}px`;
    bubble.style.animationDuration = `${Math.random() * 11 + 12}s`;
    bubble.style.animationDelay = `${Math.random() * 10}s`;
    magicLayer.appendChild(bubble);
  }
}

function revealOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  document.querySelectorAll(".section-reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 70, 300)}ms`;
    observer.observe(element);
  });
}

function setupParallax() {
  const heroGlass = document.querySelector(".hero-glass");

  document.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 8;
    const y = (event.clientY / window.innerHeight - 0.5) * 8;
    heroGlass.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  });

  document.addEventListener("mouseleave", () => {
    heroGlass.style.transform = "rotateY(0deg) rotateX(0deg)";
  });
}

// Carousel foto auto slide dan manual.
const track = document.getElementById("carouselTrack");
const photos = Array.from(track.children);
const prevPhoto = document.getElementById("prevPhoto");
const nextPhoto = document.getElementById("nextPhoto");
let currentPhoto = 0;
let carouselTimer;

function updateCarousel() {
  track.style.transform = `translateX(-${currentPhoto * 100}%)`;
}

function goNext() {
  currentPhoto = (currentPhoto + 1) % photos.length;
  updateCarousel();
}

function goPrev() {
  currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
  updateCarousel();
}

function startCarousel() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(goNext, 3300);
}

nextPhoto.addEventListener("click", () => {
  goNext();
  startCarousel();
});

prevPhoto.addEventListener("click", () => {
  goPrev();
  startCarousel();
});

let startX = 0;
track.addEventListener("pointerdown", (event) => {
  startX = event.clientX;
});
track.addEventListener("pointerup", (event) => {
  const distance = event.clientX - startX;
  if (Math.abs(distance) > 45) {
    distance < 0 ? goNext() : goPrev();
    startCarousel();
  }
});

// Amplop digital.
let letterOpened = false;
envelope.addEventListener("click", async () => {
  if (letterOpened) return;
  letterOpened = true;

  tryPlayMusic();

  envelope.classList.add("open");
  await sleep(720);
  letterPaper.classList.add("show");
  await sleep(350);
  
  await typeText(letterTyping, loveLetter, 24);
});

// Popup reward dan efek hati berjatuhan.
rewardButton.addEventListener("click", () => {
  rewardPopup.classList.add("show");
  rewardPopup.setAttribute("aria-hidden", "false");
  launchConfetti(180);
  rainHearts();
});

function closeRewardPopup() {
  rewardPopup.classList.remove("show");
  rewardPopup.setAttribute("aria-hidden", "true");
}

closePopup.addEventListener("click", closeRewardPopup);
rewardPopup.addEventListener("click", (event) => {
  if (event.target === rewardPopup) closeRewardPopup();
});

function rainHearts() {
  for (let i = 0; i < 45; i++) {
    setTimeout(() => {
      const heart = document.createElement("span");
      heart.className = "falling-heart";
      heart.textContent = Math.random() > 0.5 ? "❤️" : "💕";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.fontSize = `${Math.random() * 18 + 18}px`;
      heart.style.animationDuration = `${Math.random() * 2.5 + 3.5}s`;
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 7000);
    }, i * 70);
  }
}

// Music player.
bgMusic.volume = Number(volumeMusic.value);

async function tryPlayMusic() {
  try {
    await bgMusic.play();
  } catch (error) {}
}

playMusic.addEventListener("click", tryPlayMusic);
pauseMusic.addEventListener("click", () => bgMusic.pause());
volumeMusic.addEventListener("input", () => {
  bgMusic.volume = Number(volumeMusic.value);
});

// Confetti sederhana.
const canvas = document.getElementById("confettiCanvas");
const ctx = canvas.getContext("2d");
let confettiPieces = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function launchConfetti(count = 120) {
  const colors = ["#ff8db8", "#ffd6e7", "#ffe5cf", "#eadfff", "#ffffff", "#d94f83"];
  confettiPieces = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: Math.random() * 8 + 5,
    speed: Math.random() * 3.4 + 2.1,
    rotation: Math.random() * Math.PI,
    spin: Math.random() * 0.18 - 0.09,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces.forEach(piece => {
    piece.y += piece.speed;
    piece.x += Math.sin(piece.y * 0.012);
    piece.rotation += piece.spin;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.58);
    ctx.restore();
  });

  confettiPieces = confettiPieces.filter(piece => piece.y < canvas.height + 35);
  requestAnimationFrame(animateConfetti);
}

window.addEventListener("resize", resizeCanvas);

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (!orderId) {
    heroText = "Selamat Sayang ❤️";
    loveLetter = "Link kado tidak valid.";
  } else {
    try {
      const { data: kado, error } = await supabaseClient
        .from('pesanan')
        .select('*')
        .eq('id_kado', orderId)
        .single();

      if (error) throw error;

      if (kado) {
        // Mengambil data teks dengan fleksibel dari kolom database
        heroText = kado.teks_hero || kado.pesan || kado.ucapan || "🎉 Selamat Sayang ❤️";
        loveLetter = kado.teks_surat || kado.surat || kado.pesan_surat || "Terima kasih sudah berjuang sejauh ini ya sayangku.";

        // Menarik foto-foto dari database
        const fotoList = [
          kado.link_foto_1 || kado.foto_1,
          kado.link_foto_2 || kado.foto_2,
          kado.link_foto_3 || kado.foto_3,
          kado.link_foto_4 || kado.foto_4,
          kado.link_foto_5 || kado.foto_5,
          kado.link_foto_6 || kado.foto_6
        ];

        fotoList.forEach((linkFoto, index) => {
          const imgEl = document.getElementById(`foto${index + 1}`);
          if (imgEl && linkFoto) {
            imgEl.src = linkFoto;
          }
        });

        if (kado.link_musik || kado.musik) {
          bgMusic.src = kado.link_musik || kado.musik;
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data:", err.message);
      heroText = "🎉 Selamat Sayang ❤️";
      loveLetter = "Tetap semangat ya sayang, aku selalu bangga sama kamu!";
    }
  }

  createMagicBackground();
  revealOnScroll();
  setupParallax();
  resizeCanvas();
  animateConfetti();
  launchConfetti(110);
  startCarousel();
  
  await typeText(heroTyping, heroText, 42);

  if (localStorage.getItem("semesterCelebrationPlayMusic") === "true") {
    localStorage.removeItem("semesterCelebrationPlayMusic");
    tryPlayMusic();
  }
}

init();