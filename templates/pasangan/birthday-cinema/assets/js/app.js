// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Gagal inisialisasi Supabase:", e);
    }
}

let dataKado = null;

const fallbackData = {
    nama_penerima: "Sayang",
    nama_pengirim: "rahmat",
    teks_hero: "Happy Birthday",
    teks_surat: "Terima kasih sudah hadir dan membawa warna terindah dalam setiap perjalanan ini. Semoga hari-hari ke depan senantiasa dipenuhi kebahagiaan untukmu.",
    link_foto_1: "https://images.unsplash.com/photo-1518199268839-0f6667ec363f?w=400&q=80",
    link_foto_2: "https://images.unsplash.com/photo-1516589178581-6cd785311b51?w=400&q=80",
    link_foto_3: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80",
    link_foto_4: "https://images.unsplash.com/photo-1494774112187-5c2f82ad306f?w=400&q=80",
    caption_1: "Awal cerita kita",
    caption_2: "Hari yang menyenangkan",
    caption_3: "Tawamu favoritku",
    caption_4: "Selamanya",
    alasan_sayang: "Karena kamu selalu tahu cara membuatku tersenyum.\nKetulusan hatimu yang selalu membuatku kagum.",
    kupon_judul: "Kejutan Spesial",
    kupon_deskripsi: "Bisa diklaim untuk 1 keinginan bebas.",
    pesan_penutup: "Mari buat lebih banyak kenangan bersama.",
    latitude: "0.5071", // Titik Lintang Pekanbaru/Indonesia
    longitude: "101.4451" // Titik Bujur Pekanbaru/Indonesia
};

function getSafeData() {
    return dataKado || fallbackData;
}

async function fetchDataPesanan() {
    if (!supabaseClient) return;

    const urlParams = new URLSearchParams(window.location.search);
    const idKado = urlParams.get('id');

    if (!idKado) return;

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .select('*')
            .eq('id_kado', idKado)
            .single();

        if (error) throw error;
        
        if (data.status === 'pending') {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:40vh; color:white; z-index:999; position:relative;'>Kado ini belum diaktifkan. Silakan hubungi admin.</h2>";
            return;
        }

        dataKado = data;

        // ==========================================
        // GANTI JUDUL PEMBUKA (HERO) DARI DATABASE
        // ==========================================
        const heroTitle = document.querySelector('.opening-content .title-gold');
        if (heroTitle && data.teks_hero) {
            heroTitle.innerText = data.teks_hero;
        }

        // ==========================================
        // SETTING AUDIO DARI SUPABASE (link_musik)
        // ==========================================
        const bgm = document.getElementById('bgm');
        if (bgm && data.link_musik) {
            bgm.src = data.link_musik;
            bgm.load();
        }

        // ==========================================
        // PRELOAD GAMBAR POLAROID (ANTI-LEMOT)
        // ==========================================
        // Mengambil link dari Supabase, lalu memaksa browser mendownloadnya di balik layar
        const fotoUrls = [data.link_foto_1, data.link_foto_2, data.link_foto_3, data.link_foto_4];
        fotoUrls.forEach(url => {
            if (url && url !== 'null' && url.trim() !== '') {
                const img = new Image(); // Membuat elemen gambar virtual
                img.src = url;           // Browser otomatis mengunduh & menyimpan ke cache
            }
        });

    } catch (err) {
        console.error("Gagal menarik data:", err);
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
    if (!container) return;
    container.innerHTML = '<div class="line"></div>'; 

    const activeData = getSafeData();
    const cards = [];
    const fallbackImage = "https://images.unsplash.com/photo-1518199268839-0f6667ec363f?w=400&q=80";

    for (let i = 1; i <= 4; i++) {
        let fotoUrl = activeData[`link_foto_${i}`] || fallbackImage;
        const caption = activeData[`caption_${i}`] || "Kenangan Indah";
        
        const polaroidCard = document.createElement('div');
        polaroidCard.className = 'polaroid-card';

        polaroidCard.innerHTML = `
            <div class="pin"></div>
            <img src="${fotoUrl}" alt="Kenangan ${i}" onerror="this.src='${fallbackImage}'">
            <p class="caption">${caption}</p>
        `;
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
        if (nameEl) nameEl.innerText = `Dari: ${activeData.nama_pengirim || 'rahmat'}`;
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
        const isiPesan = activeData.teks_surat || activeData.pesan_utama || activeData.isi_surat || "Terima kasih sudah hadir dan membawa warna terindah dalam setiap perjalanan ini.";
        
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
    
    container.innerHTML = "";
    let i = 0;
    let currentHTML = "";
    
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    
    function type() {
        if (i < text.length) {
            // Tangani pemisahan baris (enter) dari database
            if (text.charAt(i) === '\n') {
                currentHTML += "<br>";
            } else {
                currentHTML += text.charAt(i);
            }
            
            container.innerHTML = currentHTML;
            container.appendChild(cursor);
            i++;
            setTimeout(type, speed);
        } else {
            // Hilangkan kursor dan jalankan animasi berikutnya (tombol & ttd)
            setTimeout(() => {
                cursor.remove();
                if (typeof onComplete === 'function') onComplete();
            }, 1000);
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
    let reasonsArray = activeData.alasan_sayang 
        ? activeData.alasan_sayang.split('\n').filter(r => r.trim() !== '')
        : ["Karena kamu istimewa."];
        
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
    const activeData = getSafeData();
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
                    <h3>${activeData.kupon_judul || "Kejutan"}</h3>
                    <p>${activeData.kupon_deskripsi || "Berlaku seumur hidup!"}</p>
                    <button id="btn-claim" onclick="claimCoupon(event)">Klaim Sekarang ✨</button>
                </div>
            </div>
        `;
        
        closingMsg.innerText = activeData.pesan_penutup || "Mari buat lebih banyak kenangan bersama.";
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
    
    let activeData = {};
    try {
        activeData = getSafeData() || {};
    } catch (e) {
        activeData = {};
    }

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
async function initApp() {
    await fetchDataPesanan();
    const firstScene = document.getElementById('page-1-opening');
    if (firstScene) playSceneEntrance(firstScene);
    startAmbientParticles();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.preventDefault();
            startCinematicZoom();
        });
    }
});
