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
const musicState = document.getElementById("musicState");

const surpriseParams = new URLSearchParams(window.location.search);
const surpriseOrderId = surpriseParams.get("id")?.trim().toLowerCase() || "";
const semesterAccessToken = sessionStorage.getItem("semesterCelebrationAccessToken");
const semesterStoredOrderId = sessionStorage.getItem("semesterCelebrationOrderId");

if (!surpriseOrderId || !semesterAccessToken || semesterStoredOrderId !== surpriseOrderId) {
  const loginTarget = surpriseOrderId
    ? `index.html?id=${encodeURIComponent(surpriseOrderId)}`
    : "index.html";
  window.location.replace(loginTarget);
}

const supabaseClient = window.KadoDigital.createSupabaseClient();

let heroText = "";
let loveLetter = "";
let carouselTimer = null;
let currentPhoto = 0;
let startX = 0;

function isUsable(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined";
}

function cleanText(value, fallback = "") {
  return isUsable(value) ? String(value).trim() : fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function typeText(element, text, speed = 38) {
  return new Promise(resolve => {
    const content = String(text || "");
    element.textContent = "";

    if (!content) {
      resolve();
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      element.textContent += content[index] || "";
      index += 1;

      if (index >= content.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

function showSurpriseError(title, message) {
  const wrapper = document.createElement("main");
  wrapper.className = "semester-error-screen";

  const card = document.createElement("section");
  card.className = "semester-error-card";

  const icon = document.createElement("div");
  icon.className = "semester-error-icon";
  icon.textContent = "♡";

  const heading = document.createElement("h1");
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.textContent = message;

  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Coba lagi";
  retry.addEventListener("click", () => window.location.reload());

  card.append(icon, heading, copy, retry);
  wrapper.appendChild(card);
  document.body.replaceChildren(wrapper);
}

function createMagicBackground() {
  if (!magicLayer) return;

  const symbols = ["♡", "♥", "💕", "🌸", "✨"];

  for (let i = 0; i < 38; i += 1) {
    const item = document.createElement("span");
    item.className = "magic-item";
    item.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${Math.random() * 20 + 13}px`;
    item.style.animationDuration = `${Math.random() * 9 + 9}s`;
    item.style.animationDelay = `${Math.random() * 10}s`;
    magicLayer.appendChild(item);
  }

  for (let i = 0; i < 55; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 100}%`;
    sparkle.style.animationDelay = `${Math.random() * 3}s`;
    magicLayer.appendChild(sparkle);
  }

  for (let i = 0; i < 24; i += 1) {
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
  const items = document.querySelectorAll(".section-reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach(element => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  items.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 70, 300)}ms`;
    observer.observe(element);
  });
}

function setupParallax() {
  const heroGlass = document.querySelector(".hero-glass");
  if (!heroGlass || window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) {
    return;
  }

  document.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 8;
    const y = (event.clientY / window.innerHeight - 0.5) * 8;
    heroGlass.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  });

  document.addEventListener("mouseleave", () => {
    heroGlass.style.transform = "rotateY(0deg) rotateX(0deg)";
  });
}

const track = document.getElementById("carouselTrack");
const prevPhoto = document.getElementById("prevPhoto");
const nextPhoto = document.getElementById("nextPhoto");

function getPhotos() {
  return track ? Array.from(track.querySelectorAll("img")) : [];
}

function updateCarousel() {
  const photos = getPhotos();
  if (!track || photos.length === 0) return;

  currentPhoto = Math.min(currentPhoto, photos.length - 1);
  track.style.transform = `translateX(-${currentPhoto * 100}%)`;
}

function goNext() {
  const photos = getPhotos();
  if (photos.length <= 1) return;
  currentPhoto = (currentPhoto + 1) % photos.length;
  updateCarousel();
}

function goPrev() {
  const photos = getPhotos();
  if (photos.length <= 1) return;
  currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
  updateCarousel();
}

function startCarousel() {
  clearInterval(carouselTimer);
  const photos = getPhotos();

  const multiple = photos.length > 1;
  if (prevPhoto) prevPhoto.disabled = !multiple;
  if (nextPhoto) nextPhoto.disabled = !multiple;

  if (multiple) {
    carouselTimer = setInterval(goNext, 3300);
  }
}

function renderGallery(photoUrls) {
  if (!track) return;

  track.replaceChildren();
  currentPhoto = 0;

  photoUrls.filter(isUsable).slice(0, 6).forEach((url, index) => {
    const image = document.createElement("img");
    image.src = String(url).trim();
    image.alt = `Foto kenangan ${index + 1}`;
    image.loading = index < 2 ? "eager" : "lazy";
    image.addEventListener("error", () => {
      image.remove();
      updateCarousel();
      startCarousel();
    }, { once: true });
    track.appendChild(image);
  });

  updateCarousel();
  startCarousel();
}

nextPhoto?.addEventListener("click", () => {
  goNext();
  startCarousel();
});

prevPhoto?.addEventListener("click", () => {
  goPrev();
  startCarousel();
});

track?.addEventListener("pointerdown", (event) => {
  startX = event.clientX;
});

track?.addEventListener("pointerup", (event) => {
  const distance = event.clientX - startX;
  if (Math.abs(distance) > 45) {
    distance < 0 ? goNext() : goPrev();
    startCarousel();
  }
});

let letterOpened = false;
envelope?.addEventListener("click", async () => {
  if (letterOpened) return;
  letterOpened = true;

  tryPlayMusic();

  envelope.classList.add("open");
  await sleep(720);
  letterPaper?.classList.add("show");
  await sleep(350);
  await typeText(letterTyping, loveLetter, 24);
});

rewardButton?.addEventListener("click", () => {
  rewardPopup?.classList.add("show");
  rewardPopup?.setAttribute("aria-hidden", "false");
  launchConfetti(180);
  rainHearts();
});

function closeRewardPopup() {
  rewardPopup?.classList.remove("show");
  rewardPopup?.setAttribute("aria-hidden", "true");
}

closePopup?.addEventListener("click", closeRewardPopup);
rewardPopup?.addEventListener("click", (event) => {
  if (event.target === rewardPopup) closeRewardPopup();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && rewardPopup?.classList.contains("show")) {
    closeRewardPopup();
  }
});

function rainHearts() {
  for (let i = 0; i < 45; i += 1) {
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

function syncMusicUi() {
  if (!bgMusic || !playMusic || !pauseMusic || !musicState) return;

  const hasMusic = Boolean(bgMusic.getAttribute("src"));
  playMusic.disabled = !hasMusic || !bgMusic.paused;
  pauseMusic.disabled = !hasMusic || bgMusic.paused;
  volumeMusic.disabled = !hasMusic;

  if (!hasMusic) {
    musicState.textContent = "musik tidak tersedia";
  } else {
    musicState.textContent = bgMusic.paused ? "paused" : "playing";
  }
}

if (bgMusic && volumeMusic) {
  bgMusic.volume = Number(volumeMusic.value);
}

async function tryPlayMusic() {
  if (!bgMusic?.getAttribute("src")) return;

  try {
    await bgMusic.play();
  } catch (error) {
    console.warn("Musik belum bisa diputar otomatis:", error);
  }

  syncMusicUi();
}

playMusic?.addEventListener("click", tryPlayMusic);
pauseMusic?.addEventListener("click", () => {
  bgMusic.pause();
  syncMusicUi();
});
volumeMusic?.addEventListener("input", () => {
  bgMusic.volume = Number(volumeMusic.value);
});
bgMusic?.addEventListener("play", syncMusicUi);
bgMusic?.addEventListener("pause", syncMusicUi);

const canvas = document.getElementById("confettiCanvas");
const ctx = canvas?.getContext("2d");
let confettiPieces = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function launchConfetti(count = 120) {
  if (!canvas) return;

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
  if (!canvas || !ctx) return;

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
  try {
    const { data: kado, error } = await supabaseClient
      .rpc("get_semester_kado", {
        p_id_kado: surpriseOrderId,
        p_access_token: semesterAccessToken
      })
      .single();

    if (error || !kado) {
      sessionStorage.removeItem("semesterCelebrationAccessToken");
      sessionStorage.removeItem("semesterCelebrationOrderId");
      sessionStorage.removeItem("semesterCelebrationPlayMusic");
      window.location.replace(`index.html?id=${encodeURIComponent(surpriseOrderId)}`);
      return;
    }

    if (kado.template !== "semester-celebration") {
      throw new Error("Template kado tidak cocok.");
    }

    heroText = cleanText(kado.teks_hero, "🎉 Selamat Sayang ❤️");
    loveLetter = cleanText(
      kado.teks_surat,
      "Terima kasih sudah berjuang sejauh ini. Aku selalu bangga sama kamu."
    );

    renderGallery([
      kado.link_foto_1,
      kado.link_foto_2,
      kado.link_foto_3,
      kado.link_foto_4,
      kado.link_foto_5,
      kado.link_foto_6
    ]);

    if (isUsable(kado.link_musik)) {
      bgMusic.src = String(kado.link_musik).trim();
      bgMusic.load();
    }

    syncMusicUi();
  } catch (error) {
    console.error("Gagal memuat surprise Semester Celebration:", error);
    showSurpriseError(
      "Surprise belum bisa dimuat.",
      "Ada gangguan saat mengambil data. Coba muat ulang halaman."
    );
    return;
  }

  createMagicBackground();
  revealOnScroll();
  setupParallax();
  resizeCanvas();
  animateConfetti();
  launchConfetti(110);

  await typeText(heroTyping, heroText, 42);

  if (sessionStorage.getItem("semesterCelebrationPlayMusic") === "true") {
    sessionStorage.removeItem("semesterCelebrationPlayMusic");
    tryPlayMusic();
  }
}

init();
