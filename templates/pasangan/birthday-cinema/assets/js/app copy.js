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

function renderTimelinePolaroids() {
    const container = document.getElementById('polaroid-container');
    if (!container) return;
    container.innerHTML = '<div class="line"></div>'; 

    const activeData = getSafeData();
    const tanggal = activeData.tanggal_jadian || "Kenangan Indah";

    for (let i = 1; i <= 4; i++) {
        const fotoUrl = activeData[`link_foto_${i}`];
        
        if (fotoUrl) {
            const polaroidCard = document.createElement('div');
            polaroidCard.className = 'polaroid-card';
            polaroidCard.style.animationDelay = `${(i - 1) * 0.5}s`;

            polaroidCard.innerHTML = `
                <div class="pin"></div>
                <img src="${fotoUrl}" alt="Kenangan ${i}">
                <p class="caption">
                    Bersamamu<br>
                    <span>${tanggal}</span>
                </p>
            `;
            container.appendChild(polaroidCard);
        }
    }
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

function nextScene(currentSceneId, nextSceneId) {
    const current = document.getElementById(currentSceneId);
    const next = document.getElementById(nextSceneId);
    
    if (current && next) {
        current.classList.remove('active');
        current.classList.add('hidden');
        
        setTimeout(() => {
            next.classList.remove('hidden');
            next.classList.add('active');
            
            if (nextSceneId === 'page-2-letter') setTimeout(startLoveLetter, 500);
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
}

function openGift() {
    const giftBox = document.querySelector('.gift-container');
    const giftContent = document.getElementById('gift-content');
    
    if(!giftBox || !giftContent) return;

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

function startCinematicZoom() {
    const openingContent = document.querySelector('.opening-content');
    openingContent.style.transition = 'opacity 0.5s ease';
    openingContent.style.opacity = '0';

    const overlay = document.getElementById('zoom-overlay');
    overlay.classList.remove('hidden');

    const stars = overlay.querySelector('.stars-layer');
    const earth = overlay.querySelector('.earth-layer');
    const clouds = overlay.querySelector('.clouds-layer');
    const flash = overlay.querySelector('.flash-layer');

    stars.classList.add('anim-stars');
    earth.classList.add('anim-earth');
    clouds.classList.add('anim-clouds');
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
        }, 1000);
    }, 7500);
}