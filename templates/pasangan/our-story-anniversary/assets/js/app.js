const supabaseClient = window.KadoDigital.createSupabaseClient();

let dataKado = null;
let relationshipTimer = null;
let letterTypingTimer = null;

const DEFAULT_QUIZ_OPTIONS = [
  "Kencan yang nggak direncanakan",
  "Hari kita ketawa sampai lupa waktu",
  "Foto random yang ternyata jadi favorit",
  "Petualangan kecil kita",
  "Hari pertama yang bikin deg-degan",
  "Momen sederhana yang terasa spesial",
  "Jalan sore berdua",
  "Hari yang pengin diulang lagi"
];

function isUsable(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined";
}

function cleanText(value, fallback = "") {
  return isUsable(value) ? String(value).trim() : fallback;
}

function getPhotos(data) {
  return [
    data.link_foto_1,
    data.link_foto_2,
    data.link_foto_3,
    data.link_foto_4,
    data.link_foto_5,
    data.link_foto_6
  ].filter(isUsable);
}

function getCaptions(data) {
  return [
    data.caption_1,
    data.caption_2,
    data.caption_3,
    data.caption_4
  ].map((value, index) => cleanText(value, `Memory ${index + 1}`));
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showLoadingMessage(title, message) {
  const loading = document.getElementById("loading");
  const card = createElement("div", "loading-card");
  const heart = createElement("div", "loading-heart", "♡");
  const heading = createElement("h1", "", title);
  const copy = createElement("p", "loading-copy", message);

  card.append(heart, heading, copy);
  loading.replaceChildren(card);
}

function formatDate(value) {
  if (!isUsable(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return cleanText(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

async function fetchDataPesanan() {
  const params = new URLSearchParams(window.location.search);
  const idKado = cleanText(params.get("id")).toLowerCase();

  if (!idKado) {
    showLoadingMessage("Memory missing.", "Link kado ini tidak punya ID yang valid.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .rpc("get_kado_by_id", { p_id_kado: idKado })
      .single();

    if (error || !data) {
      throw error || new Error("Data kado tidak ditemukan.");
    }

    if (data.template !== "our-story-anniversary") {
      showLoadingMessage("Wrong chapter.", "Link ini bukan untuk template Our Story.");
      return;
    }

    await window.KadoDigital.hydratePrivatePhotos(supabaseClient, data);
    dataKado = data;
    renderStory(data);
    setupAmbientDecorations();
    setupScrollProgress();
    setupRevealObserver();

    document.getElementById("loading").classList.add("hidden");
    document.getElementById("guess-memory").classList.remove("hidden");

    requestAnimationFrame(() => {
      document.querySelectorAll("#guess-memory .reveal").forEach((element) => {
        element.classList.add("visible");
      });
    });
  } catch (error) {
    console.error("Gagal memuat Our Story:", error);
    showLoadingMessage(
      "Cerita ini belum bisa dibuka.",
      "Pastikan link benar dan kado sudah diaktifkan."
    );
  }
}

function renderStory(data) {
  renderHero(data);
  renderQuiz(data);
  renderCounter(data);
  renderTimeline(data);
  renderGallery(data);
  renderReasons(data);
  setupMusic(data);
  setupLetter(data);
  setupCoupon(data);
  setupFinal(data);
}

function renderHero(data) {
  const receiver = cleanText(data.nama_penerima, "Sayang");
  const sender = cleanText(data.nama_pengirim, "aku");
  const dateLabel = formatDate(data.tanggal_jadian);
  const captions = getCaptions(data);
  const photos = getPhotos(data);

  document.getElementById("hero-headline").textContent = `Happy Anniversary,\n${receiver}`;
  document.getElementById("hero-subheadline").textContent = cleanText(
    data.teks_hero,
    "Semua hal kecil terasa lebih indah sejak ada kamu di dalam ceritanya."
  );
  document.getElementById("hero-date").textContent = dateLabel || "our favorite chapter";
  document.getElementById("hero-photo-caption").textContent = captions[0] || "one of my favorite memories";
  document.getElementById("letter-sender").textContent = sender;
  document.getElementById("letter-date").textContent = dateLabel || "for the days we keep choosing us";

  const heroImage = document.getElementById("hero-img");
  if (photos[0]) {
    heroImage.src = photos[0];
    heroImage.alt = `Kenangan ${receiver}`;
  } else {
    heroImage.closest(".hero-photo-card")?.classList.add("hidden");
  }

  document.getElementById("hero-continue").addEventListener("click", () => {
    document.getElementById("counter").scrollIntoView({ behavior: "smooth" });
  });
}

function buildQuizRounds(data) {
  const photos = getPhotos(data).slice(0, 3);
  const captions = getCaptions(data);

  return photos.map((photo, index) => {
    const answer = captions[index] || `Memory ${index + 1}`;
    const pool = [
      ...captions.filter((caption) => caption !== answer),
      ...DEFAULT_QUIZ_OPTIONS
    ];

    const decoys = [];
    for (const option of shuffle(pool)) {
      if (option !== answer && !decoys.includes(option)) {
        decoys.push(option);
      }
      if (decoys.length === 3) break;
    }

    return {
      photo,
      answer,
      options: shuffle([answer, ...decoys])
    };
  });
}

function renderQuiz(data) {
  const game = document.getElementById("game-ui");
  const rounds = buildQuizRounds(data);

  if (rounds.length === 0) {
    renderQuizCompletion(game, "Nggak ada foto untuk ditebak, tapi ceritanya tetap menunggu kamu.");
    return;
  }

  let currentRound = 0;

  const showRound = () => {
    const round = rounds[currentRound];
    game.replaceChildren();

    const card = createElement("div", "quiz-card tilt-card");
    const topLine = createElement("div", "quiz-topline");
    topLine.append(
      createElement("span", "", `Memory ${currentRound + 1} of ${rounds.length}`)
    );

    const dots = createElement("div", "quiz-dots");
    rounds.forEach((_, index) => {
      const dot = createElement("span", "quiz-dot");
      if (index < currentRound) dot.classList.add("done");
      if (index === currentRound) dot.classList.add("active");
      dots.appendChild(dot);
    });
    topLine.appendChild(dots);

    const imageWrap = createElement("div", "quiz-image-wrap");
    const image = createElement("img", "quiz-image");
    image.src = round.photo;
    image.alt = "Foto kenangan yang diburamkan";
    imageWrap.appendChild(image);

    const question = createElement("h3", "quiz-question", "Foto ini tentang momen apa?");
    const options = createElement("div", "quiz-options");
    const feedback = createElement("p", "quiz-feedback");

    round.options.forEach((optionText) => {
      const button = createElement("button", "quiz-option", optionText);
      button.type = "button";

      button.addEventListener("click", () => {
        if (button.disabled) return;

        if (optionText === round.answer) {
          button.classList.add("correct");
          image.classList.add("revealed");
          feedback.textContent = "Benar. Kamu masih ingat. ♡";
          options.querySelectorAll("button").forEach((item) => {
            item.disabled = true;
          });

          window.setTimeout(() => {
            currentRound += 1;
            if (currentRound < rounds.length) {
              showRound();
            } else {
              renderQuizCompletion(game, "Tiga kenangan terbuka. Sekarang waktunya masuk ke cerita kita.");
            }
          }, 1100);
        } else {
          button.classList.add("wrong");
          button.disabled = true;
          feedback.textContent = "Hampir. Lihat lagi bentuk momennya, bukan detail fotonya.";
        }
      });

      options.appendChild(button);
    });

    card.append(topLine, imageWrap, question, options, feedback);
    game.appendChild(card);
    setupTiltCards(game);
  };

  showRound();
}

function renderQuizCompletion(container, message) {
  container.replaceChildren();

  const card = createElement("div", "quiz-card");
  const heading = createElement("h3", "quiz-question", "Okay, you remember us. ♥");
  const copy = createElement("p", "", message);
  copy.style.color = "var(--brown-soft)";
  copy.style.marginBottom = "22px";

  const button = createElement("button", "btn btn-primary", "Enter our story →");
  button.type = "button";
  button.addEventListener("click", enterMainStory);

  card.append(heading, copy, button);
  container.appendChild(card);
}

function enterMainStory() {
  document.getElementById("guess-memory").classList.add("hidden");
  document.getElementById("main-content").classList.remove("hidden");

  setupRevealObserver();
  setupTiltCards(document);

  const floatingMusic = document.getElementById("floating-music");
  if (document.getElementById("bgm").getAttribute("src")) {
    floatingMusic.classList.remove("hidden");
  }

  requestAnimationFrame(() => {
    document.querySelectorAll("#hero .reveal").forEach((element) => {
      element.classList.add("visible");
    });
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCounter(data) {
  const counter = document.getElementById("counter-ui");
  const label = document.getElementById("counter-since-label");
  const startValue = cleanText(data.tanggal_jadian);

  if (!startValue) {
    counter.replaceChildren(
      createElement("div", "counter-item", "Tanggal spesial belum diisi.")
    );
    return;
  }

  const start = new Date(`${startValue}T00:00:00`);
  if (Number.isNaN(start.getTime())) return;

  label.textContent = `Sejak ${formatDate(startValue)}, cerita ini terus bertambah.`;

  const units = [
    ["days", "days"],
    ["hours", "hours"],
    ["minutes", "minutes"],
    ["seconds", "seconds"]
  ];

  const numberElements = {};

  units.forEach(([key, labelText]) => {
    const item = createElement("div", "counter-item");
    const number = createElement("span", "counter-number", "0");
    const unit = createElement("span", "counter-label", labelText);
    numberElements[key] = number;
    item.append(number, unit);
    counter.appendChild(item);
  });

  const tick = () => {
    const now = new Date();
    const diff = Math.max(0, now.getTime() - start.getTime());
    const totalSeconds = Math.floor(diff / 1000);

    numberElements.days.textContent = String(Math.floor(totalSeconds / 86400));
    numberElements.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
    numberElements.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    numberElements.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
  };

  tick();
  if (relationshipTimer) clearInterval(relationshipTimer);
  relationshipTimer = window.setInterval(tick, 1000);
}

function renderTimeline(data) {
  const timeline = document.getElementById("story-timeline");
  const photos = getPhotos(data).slice(0, 4);
  const captions = getCaptions(data);

  const count = Math.max(Math.min(photos.length, 4), Math.min(captions.length, 4));

  for (let index = 0; index < count; index += 1) {
    const item = createElement("article", "story-item reveal");
    const photo = createElement("figure", "story-photo");
    const img = createElement("img");
    img.src = photos[index] || photos[0] || "";
    img.alt = `Chapter ${index + 1}`;
    photo.appendChild(img);

    const dot = createElement("span", "story-dot");
    const copy = createElement("div", "story-copy");
    const number = createElement("span", "story-number", `CHAPTER 0${index + 1}`);
    const title = createElement("h3", "", captions[index] || `Our memory ${index + 1}`);

    const descriptions = [
      "Satu momen kecil yang tanpa sadar jadi awal dari banyak cerita berikutnya.",
      "Hari biasa yang entah bagaimana berubah jadi kenangan yang ingin disimpan lama.",
      "Di titik ini, rasanya cerita kita mulai punya bahasa kecilnya sendiri.",
      "Dan dari semua foto yang ada, yang ini selalu punya tempat khusus."
    ];

    const description = createElement("p", "", descriptions[index] || "Salah satu bagian favorit dari perjalanan kita.");
    copy.append(number, title, description);
    item.append(photo, dot, copy);
    timeline.appendChild(item);
  }
}

function renderGallery(data) {
  const gallery = document.getElementById("gallery-container");
  const photos = getPhotos(data);
  const captions = getCaptions(data);

  photos.forEach((photoUrl, index) => {
    const card = createElement("figure", "memory-card reveal tilt-card");
    const image = createElement("img");
    image.src = photoUrl;
    image.alt = `Kenangan ${index + 1}`;

    const caption = createElement(
      "figcaption",
      "memory-caption",
      captions[index] || `our little memory ${index + 1}`
    );

    card.append(image, caption);
    gallery.appendChild(card);
  });
}

function renderReasons(data) {
  const list = document.getElementById("reasons-list");
  const raw = cleanText(data.alasan_sayang);

  const reasons = raw
    ? raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [
        "Karena aku bisa jadi diriku sendiri di dekatmu.",
        "Karena hal sederhana terasa lebih seru kalau dilakukan bareng kamu.",
        "Karena kamu selalu punya cara untuk membuat hari yang berat terasa lebih ringan."
      ];

  reasons.slice(0, 8).forEach((reason, index) => {
    const card = createElement("article", "reason-card reveal");
    const number = createElement("span", "reason-number", String(index + 1).padStart(2, "0"));
    const text = createElement("p", "", reason);
    card.append(number, text);
    list.appendChild(card);
  });
}

function setupMusic(data) {
  const section = document.getElementById("our-song");
  const audio = document.getElementById("bgm");
  const button = document.getElementById("music-toggle");
  const floating = document.getElementById("floating-music");
  const floatingLabel = document.getElementById("floating-music-label");
  const disc = document.getElementById("vinyl-disc");
  const statusDot = document.getElementById("music-status-dot");
  const statusText = document.getElementById("music-status-text");
  const musicUrl = cleanText(data.link_musik);

  if (!musicUrl) return;

  section.classList.remove("hidden");
  audio.src = musicUrl;
  audio.volume = 0.55;

  const syncMusicUi = () => {
    const playing = !audio.paused;

    button.textContent = playing ? "❚❚ Jeda lagu kita" : "▶ Putar lagu kita";
    floatingLabel.textContent = playing ? "pause" : "play";
    statusText.textContent = playing ? "playing" : "paused";

    disc.classList.toggle("playing", playing);
    floating.classList.toggle("playing", playing);
    statusDot.classList.toggle("active", playing);
  };

  const toggle = async () => {
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.warn("Browser menolak autoplay audio:", error);
    }
    syncMusicUi();
  };

  button.addEventListener("click", toggle);
  floating.addEventListener("click", toggle);
  audio.addEventListener("play", syncMusicUi);
  audio.addEventListener("pause", syncMusicUi);
  syncMusicUi();
}

function setupLetter(data) {
  const section = document.getElementById("love-letter");
  const openButton = document.getElementById("open-letter");
  const envelope = document.getElementById("envelope-scene");
  const paper = document.getElementById("letter-paper");
  const letterText = document.getElementById("letter-text");
  const content = cleanText(data.teks_surat);

  if (!content) return;

  section.classList.remove("hidden");

  openButton.addEventListener("click", () => {
    if (!paper.classList.contains("hidden")) return;

    envelope.classList.add("hidden");
    paper.classList.remove("hidden");
    letterText.textContent = "";

    let index = 0;
    if (letterTypingTimer) clearInterval(letterTypingTimer);

    letterTypingTimer = window.setInterval(() => {
      letterText.textContent += content[index] || "";
      index += 1;

      if (index >= content.length) {
        clearInterval(letterTypingTimer);
        letterTypingTimer = null;
      }
    }, 18);

    window.setTimeout(() => {
      paper.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  });
}

function setupCoupon(data) {
  const section = document.getElementById("coupon");
  const title = cleanText(data.kupon_judul);
  const description = cleanText(data.kupon_deskripsi);

  if (!title && !description) return;

  section.classList.remove("hidden");
  document.getElementById("coupon-title").textContent = title || "One Unlimited Hug";
  document.getElementById("coupon-desc").textContent = description || "Berlaku kapan saja. Tanpa tanggal kedaluwarsa.";

  const button = document.getElementById("redeem-coupon");
  const status = document.getElementById("coupon-status");

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Redeemed ♥";
    status.textContent = "Screenshot ini dan tagih ke orang yang ngasih kado. Nggak boleh nolak. :)";
    burstHearts(document.getElementById("coupon-card"), 18);
  });
}

function setupFinal(data) {
  document.getElementById("final-msg").textContent = cleanText(
    data.pesan_penutup,
    "Terima kasih sudah menjadi bagian dari cerita yang masih ingin terus kutulis."
  );

  document.getElementById("show-final").addEventListener("click", () => {
    const finalSection = document.getElementById("final-surprise");
    finalSection.classList.remove("hidden");
    setupRevealObserver();

    window.setTimeout(() => {
      finalSection.scrollIntoView({ behavior: "smooth" });
      launchCelebration();
    }, 80);
  });

  document.getElementById("replay-story").addEventListener("click", () => {
    window.location.reload();
  });

  document.getElementById("back-to-top").addEventListener("click", () => {
    document.getElementById("hero").scrollIntoView({ behavior: "smooth" });
  });
}

function burstHearts(target, amount = 12) {
  const rect = target.getBoundingClientRect();

  for (let i = 0; i < amount; i += 1) {
    const heart = createElement("span", "", i % 3 === 0 ? "✦" : "♥");
    heart.style.position = "fixed";
    heart.style.left = `${rect.left + rect.width / 2}px`;
    heart.style.top = `${rect.top + rect.height / 2}px`;
    heart.style.zIndex = "999";
    heart.style.pointerEvents = "none";
    heart.style.color = i % 2 === 0 ? "var(--burgundy)" : "var(--rose)";
    heart.style.fontSize = `${12 + Math.random() * 18}px`;
    heart.style.transition = "transform .9s ease-out, opacity .9s ease-out";
    document.body.appendChild(heart);

    const angle = (Math.PI * 2 * i) / amount;
    const distance = 60 + Math.random() * 90;

    requestAnimationFrame(() => {
      heart.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${Math.random() * 180}deg)`;
      heart.style.opacity = "0";
    });

    window.setTimeout(() => heart.remove(), 950);
  }
}

function launchCelebration() {
  const layer = document.getElementById("celebration-layer");
  layer.replaceChildren();

  const colors = ["#e4a9b2", "#efb08f", "#c69a58", "#aa8ba7", "#f8f1e8"];

  for (let i = 0; i < 42; i += 1) {
    const piece = createElement("span", "celebration-piece", i % 4 === 0 ? "✿" : "♥");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--duration", `${4 + Math.random() * 4}s`);
    piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    piece.style.setProperty("--size", `${10 + Math.random() * 18}px`);
    piece.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);
    piece.style.animationDelay = `${Math.random() * 1.4}s`;
    layer.appendChild(piece);
  }
}

function setupAmbientDecorations() {
  const layer = document.getElementById("ambient-layer");
  if (layer.childElementCount) return;

  const petalPairs = [
    ["#e4a9b2", "#efb08f"],
    ["#aa8ba7", "#e4a9b2"],
    ["#879883", "#f0c6ab"],
    ["#c69a58", "#e4a9b2"]
  ];

  for (let i = 0; i < 11; i += 1) {
    const flower = createElement("span", "ambient-flower");
    const pair = petalPairs[i % petalPairs.length];
    flower.style.setProperty("--petal-a", pair[0]);
    flower.style.setProperty("--petal-b", pair[1]);
    flower.style.left = `${Math.random() * 96}%`;
    flower.style.top = `${Math.random() * 94}%`;
    flower.style.transform = `scale(${0.55 + Math.random() * 0.8})`;
    flower.style.animationDuration = `${13 + Math.random() * 15}s`;
    layer.appendChild(flower);
  }

  for (let i = 0; i < 6; i += 1) {
    const heart = createElement("span", "ambient-heart", i % 2 ? "♡" : "♥");
    heart.style.left = `${Math.random() * 92}%`;
    heart.style.top = `${Math.random() * 90}%`;
    heart.style.fontSize = `${15 + Math.random() * 18}px`;
    heart.style.animationDelay = `${Math.random() * 6}s`;
    layer.appendChild(heart);
  }
}

function setupRevealObserver() {
  const elements = document.querySelectorAll(".reveal:not(.visible)");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        instance.unobserve(entry.target);
      });
    },
    { threshold: 0.13 }
  );

  elements.forEach((element) => observer.observe(element));
}

function setupTiltCards(scope = document) {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  scope.querySelectorAll?.(".tilt-card").forEach((card) => {
    if (card.dataset.tiltReady === "true") return;
    card.dataset.tiltReady = "true";

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      card.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 7}deg) translateY(-4px)`;
      card.style.boxShadow = "0 28px 70px rgba(73, 28, 41, .18)";
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      card.style.boxShadow = "";
    });
  });
}

function setupScrollProgress() {
  const bar = document.getElementById("scroll-progress");

  const update = () => {
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = documentHeight > 0 ? window.scrollY / documentHeight : 0;
    bar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

window.addEventListener("DOMContentLoaded", fetchDataPesanan);
