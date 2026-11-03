// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
let supabaseClient = null;
try {
    supabaseClient = window.KadoDigital.createSupabaseClient();
} catch (e) {
    console.error("Gagal inisialisasi Supabase:", e);
}

let dataKado = null;

function isUsable(value) {
    if (value === null || value === undefined) return false;
    const text = String(value).trim();
    return text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined";
}

function cleanText(value, fallback = "") {
    return isUsable(value) ? String(value).trim() : fallback;
}

function getSafeData() {
    return dataKado;
}

function showBirthdayError(title, message) {
    const wrapper = document.createElement('main');
    wrapper.className = 'template-error-screen';

    const card = document.createElement('section');
    card.className = 'template-error-card';

    const icon = document.createElement('div');
    icon.className = 'template-error-icon';
    icon.textContent = '♡';

    const heading = document.createElement('h1');
    heading.textContent = title;

    const copy = document.createElement('p');
    copy.textContent = message;

    card.append(icon, heading, copy);
    wrapper.appendChild(card);
    document.body.replaceChildren(wrapper);
}

async function fetchDataPesanan() {
    if (!supabaseClient) {
        showBirthdayError('Koneksi belum siap.', 'Supabase gagal diinisialisasi.');
        return false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const idKado = cleanText(urlParams.get('id')).toLowerCase();

    if (!idKado) {
        showBirthdayError('Link kado tidak valid.', 'ID kado tidak ditemukan di URL.');
        return false;
    }

    try {
        const { data, error } = await supabaseClient
            .rpc('get_kado_by_id', { p_id_kado: idKado })
            .single();

        if (error || !data) {
            throw error || new Error('Data kado tidak ditemukan.');
        }

        if (data.template !== 'birthday-cinema') {
            showBirthdayError('Template tidak cocok.', 'Link ini bukan untuk Birthday Cinema.');
            return false;
        }

        await window.KadoDigital.hydratePrivatePhotos(supabaseClient, data);
        dataKado = data;

        const receiver = cleanText(data.nama_penerima, 'Sayang');
        const heroTitle = document.querySelector('.opening-content .title-gold');
        if (heroTitle) {
            heroTitle.textContent = cleanText(data.teks_hero, `Happy Birthday, ${receiver}`);
        }

        const bgm = document.getElementById('bgm');
        if (bgm && isUsable(data.link_musik)) {
            bgm.src = String(data.link_musik).trim();
            bgm.load();
        }

        [data.link_foto_1, data.link_foto_2, data.link_foto_3, data.link_foto_4]
            .filter(isUsable)
            .forEach((url) => {
                const img = new Image();
                img.src = String(url).trim();
            });

        return true;
    } catch (err) {
        console.error('Gagal menarik data Birthday Cinema:', err);
        showBirthdayError(
            'Kado belum bisa dibuka.',
            'Pastikan link benar dan kado sudah diaktifkan oleh admin.'
        );
        return false;
    }
}

// ==========================================
// 2. FUNGSI UI & KONTEN HALAMAN
// ==========================================
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
    const activeData = getSafeData();
    if (!container || !activeData) return;

    container.replaceChildren();

    const line = document.createElement('div');
    line.className = 'line';
    container.appendChild(line);

    const cards = [];

    for (let i = 1; i <= 4; i++) {
        const fotoUrl = activeData[`link_foto_${i}`];
        if (!isUsable(fotoUrl)) continue;

        const caption = cleanText(activeData[`caption_${i}`], `Kenangan ${i}`);

        const polaroidCard = document.createElement('div');
        polaroidCard.className = 'polaroid-card';

        const pin = document.createElement('div');
        pin.className = 'pin';

        const image = document.createElement('img');
        image.src = String(fotoUrl).trim();
        image.alt = `Kenangan ${i}`;
        image.loading = 'eager';
        image.addEventListener('error', () => polaroidCard.remove(), { once: true });

        const captionEl = document.createElement('p');
        captionEl.className = 'caption';
        captionEl.textContent = caption;

        polaroidCard.append(pin, image, captionEl);
        container.appendChild(polaroidCard);
        cards.push(polaroidCard);
    }

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

// ==========================================
// LOGIKA ANIMASI BUKA SURAT & EFEK MENGETIK
// ==========================================

function triggerLetterScene(activeData) {
    nextScene('page-1-opening', 'page-2-letter');
    
    // Siapkan nama pengirim, tapi sembunyikan dulu sampai ketikan selesai
    const signature = document.querySelector('.signature');
    if (signature) {
        const nameEl = signature.querySelector('.name');
        if (nameEl) nameEl.textContent = `Dari: ${cleanText(activeData.nama_pengirim, 'Aku')}`;
        signature.style.opacity = '0';
    }

    // Jalankan animasi buka amplop setelah jeda transisi scene (800ms)
    setTimeout(() => {
        revealLoveLetter(activeData);
    }, 800);
}

function revealLoveLetter(activeData) {
    const label = document.querySelector('.envelope-label');
    const flap = document.getElementById('envelopeFlap');
    const seal = document.getElementById('waxSeal');
    const scene = document.querySelector('.envelope-scene');
    const paper = document.getElementById('letterPaper');
    const btnNext = document.getElementById('btn-next-letter');

    // 1. Teks "Sepucuk Surat Untukmu" muncul
    if (label) label.classList.add('label-in');
    
    // 2. Segel wax pecah
    setTimeout(() => { if (seal) seal.classList.add('seal-break'); }, 300);
    
    // 3. Penutup amplop terbuka
    setTimeout(() => { if (flap) flap.classList.add('flap-open'); }, 750);
    
    // 4. Amplop menghilang, kertas surat melayang naik (pop-up)
    setTimeout(() => {
        if (scene) scene.classList.add('done');
        if (paper) paper.classList.add('paper-reveal');
    }, 1700);
    
    // 5. Mulai ngetik setelah kertas muncul sepenuhnya
    setTimeout(() => {
        const isiPesan = cleanText(activeData.teks_surat, "Terima kasih sudah hadir dan membawa warna indah dalam perjalanan ini.");
        
        playTypewriterEffect('typewriter-text', isiPesan, 45, () => {
            // JIKA NGETIK SELESAI: Munculkan tanda tangan dan tombol lanjut
            const signature = document.querySelector('.signature');
            if (signature) {
                signature.style.opacity = '1';
                signature.style.transform = 'translateY(0)';
            }
            if (btnNext) {
                btnNext.style.opacity = '1';
            }
        });
    }, 2750);
}

function playTypewriterEffect(elementId, text, speed = 45, onComplete) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.replaceChildren();
    let i = 0;

    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';

    function type() {
        if (i < text.length) {
            i += 1;
            container.textContent = text.slice(0, i);
            container.appendChild(cursor);
            setTimeout(type, speed);
        } else {
            setTimeout(() => {
                cursor.remove();
                if (typeof onComplete === 'function') onComplete();
            }, 700);
        }
    }

    type();
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
            
            if (nextSceneId === 'page-3-timeline') renderTimelinePolaroids();
            
        }, 800);
    }
}

function pickReason() {
    const activeData = getSafeData();
    if (!activeData) return;

    const rawReasons = cleanText(activeData.alasan_sayang);
    const reasonsArray = rawReasons
        ? rawReasons.split(/\r?\n/).map((reason) => reason.trim()).filter(Boolean)
        : ['Karena kamu istimewa.'];

    const paperElement = document.getElementById('reason-paper');
    if (!paperElement) return;

    const randomIndex = Math.floor(Math.random() * reasonsArray.length);
    const selectedReason = reasonsArray[randomIndex];

    const note = document.createElement('div');
    note.className = 'paper-note';
    note.textContent = selectedReason;
    paperElement.replaceChildren(note);
    paperElement.classList.remove('hidden');

    paperElement.classList.remove('pop-up-anim');
    void paperElement.offsetWidth;
    paperElement.classList.add('pop-up-anim');

    const jar = document.getElementById('reason-jar');
    if (jar) {
        const rect = jar.getBoundingClientRect();
        burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 8, ['✦', '✧', '❤']);
    }
}

function openGift() {
    const activeData = getSafeData();
    const giftBox = document.getElementById('gift-box');
    const giftContent = document.getElementById('gift-content');

    if (!activeData || !giftBox || !giftContent) return;

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
        if (!voucherCard || !closingMsg) return;

        const coupon = document.createElement('div');
        coupon.className = 'love-coupon';

        const left = document.createElement('div');
        left.className = 'coupon-left';
        const ticket = document.createElement('span');
        ticket.textContent = 'LOVE TICKET';
        left.appendChild(ticket);

        const right = document.createElement('div');
        right.className = 'coupon-right';

        const title = document.createElement('h3');
        title.textContent = cleanText(activeData.kupon_judul, 'Kejutan');

        const description = document.createElement('p');
        description.textContent = cleanText(activeData.kupon_deskripsi, 'Berlaku seumur hidup!');

        const claimButton = document.createElement('button');
        claimButton.id = 'btn-claim';
        claimButton.type = 'button';
        claimButton.textContent = 'Klaim Sekarang ✨';
        claimButton.addEventListener('click', claimCoupon);

        right.append(title, description, claimButton);
        coupon.append(left, right);
        voucherCard.replaceChildren(coupon);

        closingMsg.textContent = cleanText(
            activeData.pesan_penutup,
            'Mari buat lebih banyak kenangan bersama.'
        );
        giftContent.classList.add('show-gift-anim');
    }, 600);
}

function claimCoupon(event) {
    const btn = event.currentTarget;
    btn.textContent = 'Sudah Diklaim 💕';
    btn.classList.add('claimed');
    btn.disabled = true;

    for (let i = 0; i < 5; i++) {
        setTimeout(() => createHeartRipple(event), i * 150);
    }
}

function createHeartRipple(event) {
    const heart = document.createElement('div');
    heart.textContent = '❤️';
    heart.className = 'ripple-heart';

    const rect = event.currentTarget?.getBoundingClientRect();
    const x = event.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const y = event.clientY || (rect ? rect.top : window.innerHeight / 2);

    const randomX = (Math.random() - 0.5) * 50;
    heart.style.left = `${x + randomX}px`;
    heart.style.top = `${y}px`;

    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
}

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

// ==========================================
// 3. ANIMASI ZOOM LUAR ANGKASA 3D (RUMUS PRESISI)
// ==========================================
let threeScene, threeCamera, threeRenderer, earthMesh, starParticles;
let isThreeRunning = false;
let idleRotation = true; 

function initThreeSpace() {
    if (isThreeRunning) return;
    isThreeRunning = true;
    idleRotation = true; 

    const container = document.getElementById('zoom-overlay');
    if (!container) return;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    container.insertBefore(threeRenderer.domElement, container.firstChild);

    // Bintang
    const starCount = 1500;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 2000;
        starPositions[i + 1] = (Math.random() - 0.5) * 2000;
        starPositions[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });
    starParticles = new THREE.Points(starGeometry, starMaterial);
    threeScene.add(starParticles);

    // Bumi
    const earthRadius = 5;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.8,
        metalness: 0.2,
    });
    
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.order = "YXZ";
    earthMesh.position.set(0, 0, 0); 
    threeScene.add(earthMesh);

    // Cahaya
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    threeScene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(20, 10, 20);
    threeScene.add(sunLight);

    threeCamera.position.z = 15; 

    function animateThree() {
        if (!isThreeRunning) return;
        requestAnimationFrame(animateThree);
        
        if (earthMesh && idleRotation) {
            earthMesh.rotation.y += 0.001;
        }
        if (starParticles) starParticles.rotation.y += 0.0005;

        threeRenderer.render(threeScene, threeCamera);
    }
    animateThree();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    if (!threeCamera || !threeRenderer) return;
    threeCamera.aspect = window.innerWidth / window.innerHeight;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
}

function startCinematicZoom() {
    const openingContent = document.querySelector('.opening-content');
    const overlay = document.getElementById('zoom-overlay');
    
    const activeData = getSafeData();
    if (!activeData) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof THREE === 'undefined' || typeof gsap === 'undefined' || prefersReducedMotion) {
        triggerLetterScene(activeData);
        return;
    }

    if (openingContent) {
        openingContent.style.transition = 'opacity 0.5s ease';
        openingContent.style.opacity = '0';
    }
    if (overlay) overlay.classList.remove('hidden');

    initThreeSpace();
    idleRotation = false;

    const clouds = overlay ? overlay.querySelector('.clouds-layer') : null;
    const fog = overlay ? overlay.querySelector('.fog-layer') : null;
    const flash = overlay ? overlay.querySelector('.flash-layer') : null;

    // Putar Audio saat tombol diklik
    const bgm = document.getElementById('bgm');
    if (bgm) {
        bgm.volume = 0.5;
        bgm.play().then(() => {
            console.log("Audio berhasil dimainkan.");
        }).catch(e => {
            console.log("Audio dicegah (autoplay policy):", e);
        });
    }

    let lat = parseFloat(activeData.latitude);
    let lon = parseFloat(activeData.longitude);
    
    if (isNaN(lat)) lat = 0.5071;
    if (isNaN(lon)) lon = 101.4451;

    if (typeof earthMesh !== 'undefined' && earthMesh) {
        earthMesh.rotation.set(0, 0, 0);
        var targetRotationX = lat * (Math.PI / 180);
        var targetRotationY = -(lon * (Math.PI / 180)) - 1.5708;
    } else {
        var targetRotationX = 0;
        var targetRotationY = 0;
    }

    const tl = gsap.timeline();
    
    if (typeof threeCamera !== 'undefined' && threeCamera) {
        tl.to(threeCamera.position, { z: 10, duration: 4.0, ease: "power2.inOut" }, 0);
    }
    
    if (earthMesh) {
        tl.to(earthMesh.rotation, { x: targetRotationX, y: targetRotationY, duration: 4.0, ease: "power2.inOut" }, 0);
    }
    
    if (typeof threeCamera !== 'undefined' && threeCamera) {
        tl.to(threeCamera.position, { z: 4.99, duration: 2.5, ease: "power3.in" }, 4.0);
    }
    
    if(clouds) {
        tl.fromTo(clouds, { opacity: 0, scale: 1.5, filter: "blur(5px)" }, { opacity: 0.9, scale: 4, filter: "blur(0px)", duration: 1.0, ease: "power2.in" }, 6.0);
    }
    if(fog) {
        tl.fromTo(fog, { opacity: 0, scale: 1 }, { opacity: 1, scale: 2.5, duration: 0.6, ease: "power2.in" }, 6.2);
    }
    
    if(flash) {
        tl.to(flash, {
            opacity: 1, duration: 1.0, ease: "power2.inOut",
            onComplete: () => {
                isThreeRunning = false;
                triggerLetterScene(activeData);
            }
        }, 6.4);

        tl.to(flash, {
            opacity: 0, duration: 1.0, delay: 0.2,
            onComplete: () => {
                if (overlay) overlay.classList.add('hidden');
                if (openingContent) openingContent.style.display = 'none';
                const canvas = overlay ? overlay.querySelector('canvas') : null;
                if (canvas) canvas.remove();
            }
        });
    } else {
        tl.call(() => {
            isThreeRunning = false;
            triggerLetterScene(activeData);
        }, [], 6.4);
    }
}

// ==========================================
// 4. INIT: JALANKAN SAAT WEB DIBUKA
// ==========================================
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

function setupBirthdayControls() {
    document.getElementById('btn-start')?.addEventListener('click', (event) => {
        event.preventDefault();
        startCinematicZoom();
    });

    document.getElementById('btn-next-letter')?.addEventListener('click', () => {
        nextScene('page-2-letter', 'page-3-timeline');
    });

    document.getElementById('btn-next-timeline')?.addEventListener('click', () => {
        nextScene('page-3-timeline', 'page-4-jar');
    });

    document.getElementById('btn-next-jar')?.addEventListener('click', () => {
        nextScene('page-4-jar', 'page-5-gift');
    });

    bindKeyboardAction(document.getElementById('reason-jar'), pickReason);
    bindKeyboardAction(document.getElementById('gift-box'), openGift);
}

async function initApp() {
    const loaded = await fetchDataPesanan();
    if (!loaded) return;

    setupBirthdayControls();

    const firstScene = document.getElementById('page-1-opening');
    if (firstScene) playSceneEntrance(firstScene);

    startAmbientParticles();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
