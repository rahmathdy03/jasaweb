let dataKado = null;

const fallbackData = {
    nama_penerima: "Sayang",
    nama_pengirim: "Aku",
    teks_hero: "Happy Birthday",
    teks_surat: "Menunggu surat dari database...\n\nJika kamu melihat teks ini, artinya koneksi ke Supabase belum berhasil atau data masih kosong.",
    link_foto_1: "https://images.unsplash.com/photo-1518199268839-0f6667ec363f?w=400&q=80",
    link_foto_2: "https://images.unsplash.com/photo-1516589178581-6cd785311b51?w=400&q=80",
    link_foto_3: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80",
    link_foto_4: "https://images.unsplash.com/photo-1494774112187-5c2f82ad306f?w=400&q=80",
    tanggal_jadian: "Sejak awal bertemu"
};

function getSafeData() {
    return dataKado || fallbackData;
}

/* =========================================
   ANIMASI MASUK PER HALAMAN
   Memicu class "reveal-play" pada elemen ber-class "reveal"
   di dalam scene yang baru saja aktif, dengan jeda bertahap.
   ========================================= */
function playSceneEntrance(sceneEl) {
    if (!sceneEl) return;
    const items = sceneEl.querySelectorAll('.reveal');
    items.forEach((el) => el.classList.remove('reveal-play'));
    items.forEach((el, idx) => {
        setTimeout(() => el.classList.add('reveal-play'), 150 + idx * 150);
    });
}

function renderTimelinePolaroids() {
    const container = document.getElementById('polaroid-container');
    if (!container) return;
    container.innerHTML = '<div class="line"></div>'; 

    const activeData = getSafeData();
    const tanggal = activeData.tanggal_jadian || "Kenangan Indah";
    const cards = [];

    for (let i = 1; i <= 4; i++) {
        const fotoUrl = activeData[`link_foto_${i}`];
        
        if (fotoUrl) {
            const polaroidCard = document.createElement('div');
            polaroidCard.className = 'polaroid-card';

            polaroidCard.innerHTML = `
                <div class="pin"></div>
                <img src="${fotoUrl}" alt="Kenangan ${i}">
                <p class="caption">
                    Bersamamu<br>
                    <span>${tanggal}</span>
                </p>
            `;
            container.appendChild(polaroidCard);
            cards.push(polaroidCard);
        }
    }

    // Kartu jatuh masuk satu-satu, lalu baru mulai goyang pelan (sway) setelahnya
    cards.forEach((card, i) => {
        card.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'transform') {
                card.style.animationPlayState = 'running';
                card.removeEventListener('transitionend', onEnd);
            }
        });
        setTimeout(() => card.classList.add('card-in'), 150 + i * 220);
    });
}

let letterInterval;
function startLoveLetter() {
    const activeData = getSafeData();
    const surat = activeData.teks_surat;
    const textElement = document.getElementById('typewriter-text');
    if (!textElement) return;

    textElement.innerHTML = '<span class="letter-cursor">|</span>';
    const cursor = textElement.querySelector('.letter-cursor');
    
    let i = 0;
    clearInterval(letterInterval);
    const typingSpeed = 50; 
    
    letterInterval = setInterval(() => {
        if (i < surat.length) {
            if (surat.charAt(i) === '\n') {
                cursor.insertAdjacentHTML('beforebegin', '<br>');
            } else {
                cursor.insertAdjacentText('beforebegin', surat.charAt(i));
            }
            i++;
        } else {
            clearInterval(letterInterval);
            if(cursor) cursor.style.display = 'none'; 
            
            const signature = document.querySelector('.signature');
            if (signature) {
                signature.querySelector('.name').innerText = `Dari: ${activeData.nama_pengirim}`;
                signature.style.opacity = '1';
                signature.style.transform = 'translateY(0)';
            }
        }
    }, typingSpeed);
}

/* =========================================
   URUTAN MEMBUKA AMPLOP (halaman 2)
   Label muncul -> segel pecah -> flap terbuka -> surat naik
   keluar amplop -> amplop menghilang -> mesin tik mulai.
   ========================================= */
function revealLoveLetter() {
    const label = document.querySelector('.envelope-label');
    const flap = document.getElementById('envelopeFlap');
    const seal = document.getElementById('waxSeal');
    const scene = document.querySelector('.envelope-scene');
    const paper = document.getElementById('letterPaper');

    if (label) label.classList.add('label-in');
    setTimeout(() => { if (seal) seal.classList.add('seal-break'); }, 300);
    setTimeout(() => { if (flap) flap.classList.add('flap-open'); }, 750);
    setTimeout(() => {
        if (scene) scene.classList.add('done');
        if (paper) paper.classList.add('paper-reveal');
    }, 1700);
    setTimeout(startLoveLetter, 2750);
}

function nextScene(currentSceneId, nextSceneId) {
    const current = document.getElementById(currentSceneId);
    const next = document.getElementById(nextSceneId);
    
    if (current && next) {
        current.classList.remove('active');
        current.classList.add('hidden');
        
        setTimeout(() => {
            next.classList.remove('hidden');
            next.classList.add('active');
            playSceneEntrance(next);
            
            if (nextSceneId === 'page-2-letter') setTimeout(revealLoveLetter, 900);
            if (nextSceneId === 'page-3-timeline') renderTimelinePolaroids();
            
        }, 800);
    }
}

function pickReason() {
    const reasonsArray = [
        "Karena kamu selalu tahu cara membuatku tersenyum.",
        "Cara kamu menatapku membuatku merasa istimewa.",
        "Ketulusan hatimu yang selalu membuatku kagum.",
        "Karena di dekatmu, aku merasa tenang.",
        "Suaramu adalah melodi favoritku.",
        "Karena kamu selalu menerimaku apa adanya."
    ];
        
    const paperElement = document.getElementById('reason-paper');
    if (!paperElement) return;

    const randomIndex = Math.floor(Math.random() * reasonsArray.length);
    const selectedReason = reasonsArray[randomIndex];

    paperElement.innerHTML = `<div class="paper-note">${selectedReason}</div>`;
    paperElement.classList.remove('hidden');
    
    paperElement.classList.remove('pop-up-anim'); 
    void paperElement.offsetWidth; 
    paperElement.classList.add('pop-up-anim');

    const jar = document.querySelector('.jar-container');
    if (jar) {
        const rect = jar.getBoundingClientRect();
        burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 8, ['✦', '✧', '❤']);
    }
}

function openGift() {
    const giftBox = document.querySelector('.gift-container');
    const giftContent = document.getElementById('gift-content');
    
    if(!giftBox || !giftContent) return;

    const rect = giftBox.getBoundingClientRect();
    burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 12, ['✦', '✧', '❤', '♥']);

    giftBox.style.transform = 'scale(0) rotate(180deg)';
    giftBox.style.opacity = '0';
    giftBox.style.transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.5s ease';
    
    setTimeout(() => {
        giftBox.style.display = 'none';
        giftContent.classList.remove('hidden');
        
        const voucherCard = document.querySelector('.voucher-card');
        const closingMsg = document.querySelector('.closing-message');
        
        voucherCard.innerHTML = `
            <div class="love-coupon">
                <div class="coupon-left">
                    <span>LOVE<br>TICKET</span>
                </div>
                <div class="coupon-right">
                    <h3>Kejutan Spesial</h3>
                    <p>Bisa diklaim untuk 1 keinginan bebas. Berlaku seumur hidup!</p>
                    <button id="btn-claim" onclick="claimCoupon(event)">Klaim Sekarang ✨</button>
                </div>
            </div>
        `;
        
        closingMsg.innerText = "Mari buat lebih banyak kenangan bersama.";
        giftContent.classList.add('show-gift-anim');
    }, 600);
}

function claimCoupon(event) {
    const btn = event.target;
    btn.innerHTML = "Sudah Diklaim 💕";
    btn.classList.add('claimed');
    btn.disabled = true;
    
    for(let i=0; i<5; i++) {
        setTimeout(() => createHeartRipple(event), i * 150);
    }
}

function createHeartRipple(e) {
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.className = 'ripple-heart';
    
    const x = e.clientX || e.target.getBoundingClientRect().left + 50;
    const y = e.clientY || e.target.getBoundingClientRect().top;
    
    const randomX = (Math.random() - 0.5) * 50;
    heart.style.left = `${x + randomX}px`;
    heart.style.top = `${y}px`;
    
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
}

/* =========================================
   LEDAKAN PARTIKEL (dipakai saat toples & kado dibuka)
   ========================================= */
function burstParticles(x, y, count = 8, symbols = ['✦', '❤', '✧', '♥']) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'burst-particle';
        particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 60 + Math.random() * 60;
        const tx = Math.round(Math.cos(angle) * distance);
        const ty = Math.round(Math.sin(angle) * distance);

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.fontSize = `${(0.8 + Math.random() * 0.8).toFixed(2)}rem`;

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1100);
    }
}

/* =========================================
   PARTIKEL AMBIENT (hati & kilau melayang terus-menerus)
   ========================================= */
function startAmbientParticles() {
    const container = document.getElementById('ambient-fx');
    if (!container) return;
    const symbols = ['❤', '✦', '♥', '✧'];

    setInterval(() => {
        const particle = document.createElement('span');
        particle.className = 'ambient-particle';
        particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];

        const left = (Math.random() * 100).toFixed(2);
        const size = (0.7 + Math.random() * 1.1).toFixed(2);
        const duration = (9 + Math.random() * 6).toFixed(2);
        const drift = Math.round((Math.random() - 0.5) * 120);

        particle.style.left = `${left}%`;
        particle.style.fontSize = `${size}rem`;
        particle.style.setProperty('--drift', `${drift}px`);
        particle.style.animationDuration = `${duration}s`;

        container.appendChild(particle);
        setTimeout(() => particle.remove(), parseFloat(duration) * 1000 + 500);
    }, 900);
}

function startCinematicZoom() {
    const openingContent = document.querySelector('.opening-content');
    const overlay = document.getElementById('zoom-overlay');

    // Kalau pengguna mengaktifkan "reduced motion", lewati animasi zoom
    // yang panjang dan langsung lanjut ke surat.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        nextScene('page-1-opening', 'page-2-letter');
        return;
    }

    openingContent.style.transition = 'opacity 0.5s ease';
    openingContent.style.opacity = '0';

    overlay.classList.remove('hidden');

    const stars = overlay.querySelector('.stars-layer');
    const earth = overlay.querySelector('.earth-layer');
    const clouds = overlay.querySelector('.clouds-layer');
    const fog = overlay.querySelector('.fog-layer');
    const flash = overlay.querySelector('.flash-layer');

    stars.classList.add('anim-stars');
    earth.classList.add('anim-earth');
    clouds.classList.add('anim-clouds');
    fog.classList.add('anim-fog');
    flash.classList.add('anim-flash');

    const bgm = document.getElementById('bgm');
    if (bgm) {
        bgm.volume = 0.5;
        bgm.play().catch(e => console.log("Audio dicegah browser"));
    }

    setTimeout(() => {
        nextScene('page-1-opening', 'page-2-letter');
        setTimeout(() => {
            overlay.classList.add('hidden');
            openingContent.style.display = 'none';
        }, 1500);
    }, 10800);
}

document.addEventListener('DOMContentLoaded', () => {
    const firstScene = document.getElementById('page-1-opening');
    if (firstScene) playSceneEntrance(firstScene);
    startAmbientParticles();
});