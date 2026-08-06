const steps = [
  "Menghubungkan ke Server Akademik…",
  "Auntentikasi User…",
  "Scan Kartu Hasil Ujian…",
  "Mencari Mahasiswa...",
  "Mahasiswa Ditemukan ✓",
  "Download KHS…",
  "Menyiapkan Surprise…"
];

const truthLines = [
  "BECANDAAAA EHEHEHH",
  "Aku gaa lagi ngambil data akademik kokkk",
  "Aku ingin ngasih kejutan ke seseorang yang paling aku banggain"
];

const progressFill = document.getElementById("progressFill");
const progressNumber = document.getElementById("progressNumber");
const loadingSteps = document.getElementById("loadingSteps");
const terminalCard = document.getElementById("terminalCard");
const truthScreen = document.getElementById("truthScreen");
const truthTyping = document.getElementById("truthTyping");
const pinkSky = document.getElementById("pinkSky");
const codeRain = document.getElementById("codeRain");

if (localStorage.getItem("semesterCelebrationLoggedIn") !== "true") {
  window.location.href = "index.html";
}

function createCodeRain() {
  const chars = ["0", "1", "♡", "A", "N", "I", "V", "✓"];

  for (let i = 0; i < 70; i++) {
    const dot = document.createElement("span");
    dot.className = "code-dot";
    dot.textContent = chars[Math.floor(Math.random() * chars.length)];
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.animationDuration = `${Math.random() * 6 + 5}s`;
    dot.style.animationDelay = `${Math.random() * 5}s`;
    codeRain.appendChild(dot);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function typeText(element, text, speed = 42) {
  return new Promise(resolve => {
    element.textContent = "";
    let index = 0;

    const timer = setInterval(() => {
      element.textContent += text[index];
      index++;

      if (index >= text.length) {
        clearInterval(timer);
        setTimeout(resolve, 650);
      }
    }, speed);
  });
}

function runLoading() {
  let progress = 0;
  let stepIndex = 0;

  const timer = setInterval(() => {
    progress += Math.floor(Math.random() * 5) + 3;
    if (progress > 100) progress = 100;

    progressFill.style.width = `${progress}%`;
    progressNumber.textContent = `${progress}%`;

    const shouldShowStep = progress >= ((stepIndex + 1) * (100 / steps.length));
    if (shouldShowStep && stepIndex < steps.length) {
      const li = document.createElement("li");
      li.textContent = steps[stepIndex];
      loadingSteps.appendChild(li);
      stepIndex++;
    }

    if (progress === 100) {
      clearInterval(timer);
      setTimeout(showTruth, 1800);
    }
  }, 200);
}

async function showTruth() {
  terminalCard.classList.add("hide");
  await sleep(700);

  terminalCard.style.display = "none";

  truthScreen.classList.add("show");
  await sleep(1000);

  for (const line of truthLines) {
    await typeText(truthTyping, line, 42);
    await sleep(260);
  }

  await sleep(500);
  truthScreen.classList.add("pink");
  pinkSky.classList.add("show");
  launchConfetti(130);
  startHeartPops();

  await sleep(3200);
  
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  
  window.location.href = `surprise.html?id=${orderId}`;
}

// Confetti sederhana tanpa library.
const canvas = document.getElementById("confettiCanvas");
const ctx = canvas.getContext("2d");
let confettiPieces = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function launchConfetti(count = 90) {
  const colors = ["#ff8db8", "#ffd6e7", "#ffe5cf", "#eadfff", "#ffffff", "#d94f83"];
  confettiPieces = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: Math.random() * 8 + 5,
    speed: Math.random() * 3.5 + 2.2,
    rotation: Math.random() * Math.PI,
    spin: Math.random() * 0.18 - 0.09,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces.forEach(piece => {
    piece.y += piece.speed;
    piece.x += Math.sin(piece.y * 0.01);
    piece.rotation += piece.spin;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
    ctx.restore();
  });

  confettiPieces = confettiPieces.filter(piece => piece.y < canvas.height + 30);
  requestAnimationFrame(animateConfetti);
}

function startHeartPops() {
  const interval = setInterval(() => {
    const heart = document.createElement("span");
    heart.className = "heart-pop";
    heart.textContent = Math.random() > 0.5 ? "❤️" : "💕";
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.fontSize = `${Math.random() * 16 + 18}px`;
    heart.style.animationDuration = `${Math.random() * 3 + 4}s`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 7000);
  }, 180);

  setTimeout(() => clearInterval(interval), 2900);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
createCodeRain();
animateConfetti();
runLoading();
