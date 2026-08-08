// =========================================================================
// 1. INIT SUPABASE (Menggunakan Kunci yang Sama dengan Project Existing)
// =========================================================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataKado = null;

// =========================================================================
// 2. MAIN FETCHING FUNCTION (Standard KadoDigital Architecture)
// =========================================================================
async function fetchDataPesanan() {
    if (!supabaseClient) return;

    const urlParams = new URLSearchParams(window.location.search);
    const idKado = urlParams.get('id');

    if (!idKado) {
        document.getElementById('loading').innerHTML = "<h2 class='font-serif text-burgundy'>Memory missing. Link tidak valid.</h2>";
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
            document.getElementById('loading').innerHTML = "<h2 class='font-serif text-burgundy'>Kado belum diaktifkan (Pending).</h2>";
            return;
        }

        dataKado = data;
        
        // Render data ke Shell UI
        renderShellData(data);
        
        // Transisi ke Layar Pertama (Guess The Memory)
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('guess-memory').classList.remove('hidden');

    } catch (err) {
        console.error("Gagal menarik data pesanan:", err);
        document.getElementById('loading').innerHTML = "<h2 class='font-serif text-burgundy'>Terjadi kesalahan koneksi.</h2>";
    }
}

// =========================================================================
// 3. RENDER SHELL DATA (Menyuntikkan Nilai ke DOM tanpa Animasi)
// =========================================================================
function renderShellData(data) {
    
    // --- STAGE 3: HERO ---
    const namaPenerima = data.nama_penerima || 'Sayang';
    document.getElementById('hero-headline').innerText = `Happy Anniversary,\n${namaPenerima}`;
    
    if(data.teks_hero) document.getElementById('hero-subheadline').innerText = data.teks_hero;
    if(data.tanggal_jadian) document.getElementById('hero-date').innerText = data.tanggal_jadian;
    
    if (data.link_foto_1 && data.link_foto_1 !== 'null') {
        document.getElementById('hero-img').src = data.link_foto_1;
    } else {
        document.querySelector('.hero-image-wrapper').classList.add('hidden');
    }

    // --- STAGE 8: OUR SONG (Optional) ---
    if(data.link_musik && data.link_musik !== 'null') {
        document.getElementById('our-song').classList.remove('hidden');
        document.getElementById('bgm').src = data.link_musik;
    }

    // --- STAGE 9: LOVE LETTER (Optional) ---
    if(data.teks_surat) {
        document.getElementById('love-letter').classList.remove('hidden');
    }

    // --- STAGE 10: LOVE COUPON (Optional) ---
    if(data.kupon_judul || data.kupon_deskripsi) {
        document.getElementById('coupon').classList.remove('hidden');
        document.getElementById('coupon-title').innerText = data.kupon_judul || 'Love Coupon';
        document.getElementById('coupon-desc').innerText = data.kupon_deskripsi || 'Redeem anytime.';
    }

    // --- STAGE 12: FINAL SURPRISE ---
    if(data.pesan_penutup) {
        document.getElementById('final-msg').innerText = data.pesan_penutup;
    }
}

// Jalankan saat web selesai dimuat
window.addEventListener('DOMContentLoaded', () => {
    fetchDataPesanan();
});