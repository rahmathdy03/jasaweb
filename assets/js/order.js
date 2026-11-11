// =========================================================================
// 1. KONFIGURASI SUPABASE
// =========================================================================
const supabaseClient = window.KadoDigital.createSupabaseClient();

// Slug canonical yang harus sama dengan nama folder template.
const TEMPLATE_SLUG_ALIASES = Object.freeze({
  'default-template': 'semester-celebration',
  'deeptalk': 'deeptalk-template',
  'birthday': 'birthday-cinema'
});

function normalizeTemplateSlug(slug) {
  if (!slug) return null;

  const normalized = String(slug).trim().toLowerCase();
  return TEMPLATE_SLUG_ALIASES[normalized] || normalized;
}

const ALLOWED_PHOTO_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const MAX_PRIVATE_PHOTO_SIZE = 2 * 1024 * 1024;

function isAllowedPhoto(file) {
  return Boolean(file && ALLOWED_PHOTO_MIME_TYPES.includes(file.type));
}

async function uploadPrivatePhoto({ file, idKado, templateName, uploadSession }) {
  if (!isAllowedPhoto(file)) {
    throw new Error("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
  }

  if (file.size > MAX_PRIVATE_PHOTO_SIZE) {
    throw new Error("Ukuran foto setelah kompresi masih lebih dari 2 MB.");
  }

  const { data: uploadAuth, error: authError } = await supabaseClient.functions.invoke(
    'create-kado-upload',
    {
      body: {
        id_kado: idKado,
        template: templateName,
        mime_type: file.type,
        file_size: file.size,
        upload_session: uploadSession
      }
    }
  );

  if (authError) {
    let detail = "Izin upload foto ditolak oleh server.";

    try {
      const context = authError.context;
      if (context && typeof context.clone === 'function') {
        const payload = await context.clone().json();
        if (payload?.error) detail = String(payload.error);
      }
    } catch (_) {
      // Gunakan pesan generik bila response error tidak bisa dibaca.
    }

    throw new Error(detail);
  }

  if (!uploadAuth?.path || !uploadAuth?.token) {
    throw new Error(uploadAuth?.error || "Server tidak memberikan token upload.");
  }

  const { error: uploadError } = await supabaseClient.storage
    .from('foto_kado')
    .uploadToSignedUrl(uploadAuth.path, uploadAuth.token, file);

  if (uploadError) {
    throw uploadError;
  }

  // Database hanya menyimpan path privat. URL akses dibuat sementara saat kado dibuka.
  return uploadAuth.path;
}

// =========================================================================
// 2. BLUEPRINT FORM DINAMIS (TEMPLATE-SPECIFIC FIELDS)
// =========================================================================
const templateBlueprints = {
  // Template 1: Semester Celebration
  "semester-celebration": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Keamanan & Pesan Kejutan</h3>
      <div class="input-row" style="display:flex; gap:10px;">
        <div class="input-group" style="flex:1;">
          <label>Username (Untuk Login) <span>*</span></label>
          <input type="text" id="orderUser" placeholder="Misal: sayang" minlength="3" maxlength="50" autocomplete="off" required>
        </div>
        <div class="input-group" style="flex:1;">
          <label>Password Login <span>*</span></label>
          <input type="password" id="orderPass" placeholder="Minimal 8 karakter" minlength="8" maxlength="72" autocomplete="new-password" required>
        </div>
      </div>
      <div class="input-group">
        <label>Kalimat Pembuka (Singkat) <span>*</span></label>
        <input type="text" id="teksHero" placeholder="Contoh: Selamat atas kelulusanmu sayang!" required>
      </div>
      <div class="input-group">
        <label>Surat Cinta / Pesan Panjang <span>*</span></label>
        <textarea id="teksSurat" rows="5" placeholder="Tulis semua perasaanmu di sini..." required></textarea>
      </div>
    </div>
    
    <div class="form-card">
      <div class="step-badge">Langkah 3</div>
      <h3>Kenangan & Suasana</h3>
      <div class="input-group">
        <label>Upload Foto Kenangan (3–6 Foto) <span>*</span></label>
        <input type="file" id="fotoKado" accept="image/jpeg, image/png, image/webp" multiple required>
        <small>Pilih minimal 3 dan maksimal 6 foto sekaligus dari galerimu.</small>
      </div>
      <div class="input-group">
        <label for="selectMusik">Pilih Lagu Background</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="selectMusik" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-family: inherit; font-size: 14px; color: var(--text-dark);">
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kasihputih.mp3">🎵 Preset 1: Kasih Putih</option>
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kotainitaksamatanpamu.mp3">🎵 Preset 2: Kota Ini Tak Sama Tanpamu</option>
            <option value="custom">🔗 Masukkan Link Musik Sendiri (Custom)</option>
          </select>
          <button type="button" id="btnPreviewMusik" style="padding: 10px; border-radius: 12px; border: none; background: var(--primary); color: white; cursor: pointer; font-size: 18px; display: flex; justify-content: center; align-items: center; width: 48px; height: 48px; transition: 0.3s;" title="Dengarkan Lagu">▶️</button>
        </div>
        <audio id="audioPreview" style="display: none;"></audio>
      </div>
      <div class="input-group" id="wrapperCustomMusik" style="display: none; margin-top: 10px;">
        <label for="linkMusikCustom">Link Audio (.mp3)</label>
        <input type="url" id="linkMusikCustom" placeholder="https://website.com/lagu-favorit.mp3">
      </div>
    </div>
  `,

  // Template 2: DeepTalk Night
  "deeptalk-template": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Atur Suasana DeepTalk</h3>
      <p style="font-size: 13px; color: #666; margin-bottom: 15px;">Template ini tidak butuh surat panjang. Cukup siapkan foto dan lagu terbaikmu.</p>
      
      <div class="input-group">
        <label>Upload Foto Background (2 Foto) <span>*</span></label>
        <input type="file" id="fotoKado" accept="image/jpeg, image/png, image/webp" multiple required>
        <small>Pilih 2 foto: 1 untuk halaman pembuka, 1 untuk latar permainan.</small>
      </div>
      <div class="input-group">
        <label>Tanggal Spesial / Jadian <span>*</span></label>
        <input type="date" id="orderTanggal" required>
        <small>Untuk menghitung berapa lama kalian sudah bersama.</small>
      </div>

      <div class="input-group">
        <label for="selectMusik">Pilih Lagu Background</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="selectMusik" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-family: inherit; font-size: 14px; color: var(--text-dark);">
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kasihputih.mp3">🎵 Preset 1: Kasih Putih</option>
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kotainitaksamatanpamu.mp3">🎵 Preset 2: Kota Ini Tak Sama Tanpamu</option>
            <option value="custom">🔗 Masukkan Link Musik Sendiri (Custom)</option>
          </select>
          <button type="button" id="btnPreviewMusik" style="padding: 10px; border-radius: 12px; border: none; background: var(--primary); color: white; cursor: pointer; font-size: 18px; display: flex; justify-content: center; align-items: center; width: 48px; height: 48px; transition: 0.3s;" title="Dengarkan Lagu">▶️</button>
        </div>
        <audio id="audioPreview" style="display: none;"></audio>
      </div>

      <div class="input-group" id="wrapperCustomMusik" style="display: none; margin-top: 10px;">
        <label for="linkMusikCustom">Link Audio (.mp3)</label>
        <input type="url" id="linkMusikCustom" placeholder="https://website.com/lagu-favorit.mp3">
      </div>
    </div>
  `,

  // Template 3: Portofolio
  "modern-resume": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Data Profesional</h3>
      <div class="input-group">
        <label>Profesi / Keahlian Utama <span>*</span></label>
        <input type="text" id="orderProfesi" placeholder="Misal: UI/UX Designer" required>
      </div>
    </div>
  `,

  // =========================================================================
  // TAMBAHAN BARU: Template 4 - Birthday Cinema
  // =========================================================================
  "birthday-cinema": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Teks Pembuka & Surat</h3>
      <div class="input-group">
        <label>Judul Pembuka <span>*</span></label>
        <input type="text" id="teksHero" placeholder="Contoh: Happy Birthday Sayang" required>
      </div>
      <div class="input-group">
        <label>Surat Cinta (Efek Ketik) <span>*</span></label>
        <textarea id="teksSurat" rows="3" placeholder="Tuliskan ucapan dan harapanmu di sini..." required></textarea>
      </div>
      <div class="input-group">
        <label>Alasan Kenapa Sayang (Toples) <span>*</span></label>
        <textarea id="alasanSayang" rows="3" placeholder="Karena senyummu manis.&#10;Karena kamu baik.&#10;(Gunakan 'Enter' untuk pisahkan kalimat)" required></textarea>
      </div>
    </div>

    <div class="form-card">
      <div class="step-badge">Langkah 3</div>
      <h3>Kenangan (Upload 4 Foto & Caption)</h3>
      <div class="input-group">
        <label>Upload Foto Polaroid (Maks 4 Foto) <span>*</span></label>
        <input type="file" id="fotoKado" accept="image/jpeg, image/png, image/webp" multiple required>
      </div>
      <div class="input-row" style="display:flex; gap:10px;">
        <div class="input-group" style="flex:1;"><label>Caption Foto 1</label><input type="text" id="caption1" placeholder="Awal kita bertemu"></div>
        <div class="input-group" style="flex:1;"><label>Caption Foto 2</label><input type="text" id="caption2" placeholder="Hari bahagia"></div>
      </div>
      <div class="input-row" style="display:flex; gap:10px;">
        <div class="input-group" style="flex:1;"><label>Caption Foto 3</label><input type="text" id="caption3" placeholder="Senyum manismu"></div>
        <div class="input-group" style="flex:1;"><label>Caption Foto 4</label><input type="text" id="caption4" placeholder="Selamanya"></div>
      </div>
    </div>

    <div class="form-card">
      <div class="step-badge">Langkah 4</div>
      <h3>Kupon Hadiah & Koordinat Bumi</h3>
      <div class="input-row" style="display:flex; gap:10px;">
        <div class="input-group" style="flex:1;">
          <label>Judul Kupon</label>
          <input type="text" id="kuponJudul" placeholder="Tiket Peluk">
        </div>
        <div class="input-group" style="flex:1;">
          <label>Deskripsi Kupon</label>
          <input type="text" id="kuponDeskripsi" placeholder="Berlaku seumur hidup">
        </div>
      </div>
      <div class="input-group">
        <label>Pesan Penutup</label>
        <input type="text" id="pesanPenutup" placeholder="Mari buat kenangan bersama di tahun ini">
      </div>
      
      <div style="border-top: 1px dashed #ccc; margin: 15px 0;"></div>
      
      <!-- DROPDOWN LOKASI ZOOM (Pengganti Input Lintang & Bujur) -->
      <div class="input-group">
        <label>Lokasi Tujuan (Zoom Animasi Bumi) <span>*</span></label>
        <select id="pilihProvinsi" required style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-family: inherit; font-size: 14px; color: var(--text-dark);">
            <option value="" disabled selected>-- Pilih Provinsi / Kota Terdekat --</option>
            <option value="4.6951,96.7494">Aceh</option>
            <option value="3.5952,98.6722">Sumatera Utara (Medan)</option>
            <option value="-0.9471,100.4172">Sumatera Barat (Padang)</option>
            <option value="0.5071,101.4451">Riau (Pekanbaru)</option>
            <option value="-0.9818,104.7565">Sumatera Selatan (Palembang)</option>
            <option value="-6.2088,106.8456">DKI Jakarta</option>
            <option value="-6.9147,107.6098">Jawa Barat (Bandung)</option>
            <option value="-7.1509,110.1402">Jawa Tengah (Semarang)</option>
            <option value="-7.7956,110.3695">DI Yogyakarta</option>
            <option value="-7.2504,112.7688">Jawa Timur (Surabaya)</option>
            <option value="-8.4095,115.1889">Bali</option>
            <option value="-0.5022,117.1536">Kalimantan Timur (Balikpapan)</option>
            <option value="-5.1476,119.4327">Sulawesi Selatan (Makassar)</option>
            <option value="-2.5337,140.7181">Papua (Jayapura)</option>
        </select>
        <small style="color: #666; margin-top: 5px; display:block;">Pilih kota terdekat dengan domisili penerima kado.</small>
      </div>

      <!-- Fitur Musik Default Bawaan order.js -->
      <div class="input-group" style="margin-top: 15px;">
        <label for="selectMusik">Lagu Background (Opsional)</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="selectMusik" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-family: inherit; font-size: 14px; color: var(--text-dark);">
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kasihputih.mp3">🎵 Preset 1: Kasih Putih</option>
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kotainitaksamatanpamu.mp3">🎵 Preset 2: Kota Ini Tak Sama Tanpamu</option>
            <option value="custom">🔗 Masukkan Link Musik Sendiri (Custom)</option>
          </select>
          <button type="button" id="btnPreviewMusik" style="padding: 10px; border-radius: 12px; border: none; background: var(--primary); color: white; cursor: pointer; font-size: 18px; display: flex; justify-content: center; align-items: center; width: 48px; height: 48px; transition: 0.3s;" title="Dengarkan Lagu">▶️</button>
        </div>
        <audio id="audioPreview" style="display: none;"></audio>
      </div>
      <div class="input-group" id="wrapperCustomMusik" style="display: none; margin-top: 10px;">
        <label for="linkMusikCustom">Link Audio (.mp3)</label>
        <input type="url" id="linkMusikCustom" placeholder="https://website.com/lagu-favorit.mp3">
      </div>
    </div>
  `,

  // Template 5: Our Story Anniversary
  "our-story-anniversary": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Awal Cerita Kalian</h3>

      <div class="input-group">
        <label>Tanggal Jadian / Tanggal Spesial <span>*</span></label>
        <input type="date" id="orderTanggal" required>
        <small>Tanggal ini dipakai untuk relationship counter yang berjalan secara live.</small>
      </div>

      <div class="input-group">
        <label>Kalimat Pembuka Anniversary <span>*</span></label>
        <textarea id="teksHero" rows="3" maxlength="280" placeholder="Contoh: Kalau aku bisa mengulang semuanya, aku tetap akan memilih jalan yang membawaku ke kamu." required></textarea>
      </div>

      <div class="input-group">
        <label>Surat Cinta <span>*</span></label>
        <textarea id="teksSurat" rows="7" maxlength="3000" placeholder="Tulis surat yang nanti akan dibuka dari amplop digital..." required></textarea>
      </div>
    </div>

    <div class="form-card">
      <div class="step-badge">Langkah 3</div>
      <h3>Memory Quiz & Galeri</h3>

      <div class="input-group">
        <label>Upload 3–6 Foto Kenangan <span>*</span></label>
        <input type="file" id="fotoKado" accept="image/jpeg, image/png, image/webp" multiple required>
        <small>3 foto pertama akan dipakai untuk game tebak foto blur. Maksimal 6 foto.</small>
      </div>

      <div class="input-group">
        <label>Jawaban / Caption Foto 1 <span>*</span></label>
        <input type="text" id="caption1" maxlength="90" placeholder="Contoh: Kencan pertama yang bikin deg-degan" required>
      </div>

      <div class="input-group">
        <label>Jawaban / Caption Foto 2 <span>*</span></label>
        <input type="text" id="caption2" maxlength="90" placeholder="Contoh: Hari kita ketawa tanpa alasan" required>
      </div>

      <div class="input-group">
        <label>Jawaban / Caption Foto 3 <span>*</span></label>
        <input type="text" id="caption3" maxlength="90" placeholder="Contoh: Petualangan kecil favorit kita" required>
      </div>

      <div class="input-group">
        <label>Caption Foto 4 / Chapter Tambahan</label>
        <input type="text" id="caption4" maxlength="90" placeholder="Contoh: Foto yang selalu bikin aku senyum">
      </div>
    </div>

    <div class="form-card">
      <div class="step-badge">Langkah 4</div>
      <h3>Hal-Hal yang Kamu Sayang</h3>

      <div class="input-group">
        <label>Why I Love You <span>*</span></label>
        <textarea id="alasanSayang" rows="6" maxlength="1600" placeholder="Tulis satu alasan per baris.&#10;Karena kamu membuat rumah terasa seperti seseorang.&#10;Karena aku bisa jadi diriku sendiri di dekatmu.&#10;Karena kamu selalu tahu cara membuatku tertawa." required></textarea>
        <small>Satu baris akan menjadi satu kartu alasan.</small>
      </div>

      <div class="input-row" style="display:flex; gap:10px;">
        <div class="input-group" style="flex:1;">
          <label>Judul Love Coupon</label>
          <input type="text" id="kuponJudul" maxlength="70" placeholder="One Unlimited Hug">
        </div>
        <div class="input-group" style="flex:1;">
          <label>Deskripsi Coupon</label>
          <input type="text" id="kuponDeskripsi" maxlength="160" placeholder="Bisa ditukar kapan saja.">
        </div>
      </div>

      <div class="input-group">
        <label>Pesan Terakhir <span>*</span></label>
        <textarea id="pesanPenutup" rows="3" maxlength="500" placeholder="Pesan yang muncul di final surprise..." required></textarea>
      </div>
    </div>

    <div class="form-card">
      <div class="step-badge">Langkah 5</div>
      <h3>Our Song</h3>

      <div class="input-group">
        <label for="selectMusik">Pilih Lagu Background</label>
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="selectMusik" style="flex:1; padding:12px; border-radius:12px; border:1px solid var(--border); background:white; font-family:inherit; font-size:14px; color:var(--text-dark);">
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kasihputih.mp3">🎵 Preset 1: Kasih Putih</option>
            <option value="https://rvsrazqskmtpwyzjnnfm.supabase.co/storage/v1/object/public/musik-kado/kotainitaksamatanpamu.mp3">🎵 Preset 2: Kota Ini Tak Sama Tanpamu</option>
            <option value="custom">🔗 Masukkan Link Musik Sendiri (Custom)</option>
          </select>
          <button type="button" id="btnPreviewMusik" style="padding:10px; border-radius:12px; border:none; background:var(--primary); color:white; cursor:pointer; font-size:18px; display:flex; justify-content:center; align-items:center; width:48px; height:48px;" title="Dengarkan Lagu">▶️</button>
        </div>
        <audio id="audioPreview" style="display:none;"></audio>
      </div>

      <div class="input-group" id="wrapperCustomMusik" style="display:none; margin-top:10px;">
        <label for="linkMusikCustom">Link Audio (.mp3)</label>
        <input type="url" id="linkMusikCustom" placeholder="https://website.com/lagu-favorit.mp3">
      </div>
    </div>
  `
};

// =========================================================================
// 3. FUNGSI MENAMPILKAN FORM SESUAI PILIHAN
// =========================================================================
async function isTemplatePublished(slug) {
  if (!slug) return false;

  const { data, error } = await supabaseClient
    .from('templates')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Gagal memeriksa registry template:', error);
    return false;
  }

  return data?.slug === slug;
}

async function renderFormSesuaiTemplate() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateDipilih = normalizeTemplateSlug(urlParams.get('template'));
  const wadah = document.getElementById("wadahFormDinamis");

  if (!wadah) return;

  if (!templateDipilih || !templateBlueprints[templateDipilih]) {
    wadah.innerHTML = `<div class="form-card"><h3 style="color:red; text-align:center;">Silakan pilih template dari Katalog terlebih dahulu!</h3></div>`;
    return;
  }

  wadah.innerHTML = `<div class="form-card"><h3 style="text-align:center;">Memeriksa ketersediaan template... ⏳</h3></div>`;

  const published = await isTemplatePublished(templateDipilih);

  if (!published) {
    wadah.innerHTML = `<div class="form-card"><h3 style="color:red; text-align:center;">Template ini sedang tidak tersedia untuk dipesan.</h3><p style="text-align:center; color:#666; margin-top:8px;">Silakan kembali ke katalog dan pilih template yang sedang Published.</p></div>`;
    return;
  }

  wadah.innerHTML = templateBlueprints[templateDipilih];

  const selectMusik = document.getElementById("selectMusik");
  const wrapperCustom = document.getElementById("wrapperCustomMusik");
  const btnPreview = document.getElementById("btnPreviewMusik");
  const audioPreview = document.getElementById("audioPreview");

  if (selectMusik) {
    selectMusik.addEventListener("change", (e) => {
      if (audioPreview) {
        audioPreview.pause();
        if (btnPreview) btnPreview.textContent = "▶️";
      }
      if (e.target.value === "custom") {
        if(wrapperCustom) wrapperCustom.style.display = "block";
        if (btnPreview) btnPreview.style.display = "none";
      } else {
        if(wrapperCustom) wrapperCustom.style.display = "none";
        if (btnPreview) btnPreview.style.display = "flex";
      }
    });
  }

  if (btnPreview && audioPreview && selectMusik) {
    btnPreview.addEventListener("click", () => {
      if (selectMusik.value === "custom" || selectMusik.value.includes("MASUKKAN_LINK")) {
        alert("Link lagu belum dimasukkan di kode.");
        return;
      }

      if (audioPreview.paused) {
        if (audioPreview.src !== selectMusik.value) {
          audioPreview.src = selectMusik.value;
        }
        btnPreview.textContent = "⏳";
        audioPreview.play().then(() => {
          btnPreview.textContent = "⏸️";
        }).catch(() => {
          btnPreview.textContent = "▶️";
          alert("Lagu gagal diputar.");
        });
      } else {
        audioPreview.pause();
        btnPreview.textContent = "▶️";
      }
    });

    audioPreview.addEventListener("ended", () => {
      btnPreview.textContent = "▶️";
    });
  }
}

// Jalankan saat web dibuka
void renderFormSesuaiTemplate();

// =========================================================================
// 4. PROSES SUBMIT KE SUPABASE
// =========================================================================
const form = document.getElementById('orderForm');
const btnSubmit = document.getElementById('btnSubmit');

if(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    btnSubmit.innerHTML = 'Sedang Memproses Data & Foto... ⏳';
    btnSubmit.disabled = true;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const templateName = normalizeTemplateSlug(urlParams.get('template'));

      if (!templateName || !templateBlueprints[templateName]) {
        throw new Error("Template tidak valid. Silakan pilih template dari katalog.");
      }

      // Data Dasar
      const idKado = document.getElementById('orderId')?.value.trim().toLowerCase();
      const namaPengirim = document.getElementById('namaPengirim')?.value.trim();
      const namaPenerima = document.getElementById('namaPenerima')?.value.trim();
      const uploadSession = crypto.randomUUID();
      
      // Data Spesifik Template Lain
      const tanggalJadian = document.getElementById('orderTanggal')?.value || null;
      const username = document.getElementById('orderUser')?.value.trim() || null;
      const password = document.getElementById('orderPass')?.value.trim() || null;

      // Data Spesifik Birthday Cinema & Lainnya
      const teksHero = document.getElementById('teksHero')?.value.trim() || null;
      const teksSurat = document.getElementById('teksSurat')?.value.trim() || null;
      const alasanSayang = document.getElementById('alasanSayang')?.value.trim() || null;
      
      const caption1 = document.getElementById('caption1')?.value.trim() || null;
      const caption2 = document.getElementById('caption2')?.value.trim() || null;
      const caption3 = document.getElementById('caption3')?.value.trim() || null;
      const caption4 = document.getElementById('caption4')?.value.trim() || null;
      
      const kuponJudul = document.getElementById('kuponJudul')?.value.trim() || null;
      const kuponDeskripsi = document.getElementById('kuponDeskripsi')?.value.trim() || null;
      const pesanPenutup = document.getElementById('pesanPenutup')?.value.trim() || null;
      
      // ===================================================
      // PECAH DATA KOORDINAT DARI DROPDOWN
      // ===================================================
      const provinsiVal = document.getElementById('pilihProvinsi')?.value;
      let latBumi = null;
      let lonBumi = null;
      
      if (provinsiVal) {
          const coords = provinsiVal.split(',');
          latBumi = coords[0];
          lonBumi = coords[1];
      }

      // Data Musik
      const selectMusikVal = document.getElementById('selectMusik')?.value;
      const customMusikVal = document.getElementById('linkMusikCustom')?.value.trim();
      
      let linkMusikFinal = selectMusikVal;
      if (selectMusikVal === 'custom') {
        linkMusikFinal = customMusikVal || null;
      } else if (selectMusikVal && selectMusikVal.includes('MASUKKAN_LINK')) {
        linkMusikFinal = null; 
      }

// ===================================================
      // PROSES KOMPRESI & UPLOAD FOTO 
      // ===================================================
      const fotoInput = document.getElementById('fotoKado');
      let linkFotos = [null, null, null, null, null, null]; 

      if (fotoInput && fotoInput.files.length > 0) {
        const files = fotoInput.files;

        if (templateName === 'our-story-anniversary') {
          if (files.length < 3) {
            throw new Error("Our Story membutuhkan minimal 3 foto untuk Memory Quiz.");
          }
          if (files.length > 6) {
            throw new Error("Our Story maksimal menggunakan 6 foto.");
          }
        }

        if (templateName === 'birthday-cinema' && files.length > 4) {
          throw new Error("Birthday Cinema maksimal menggunakan 4 foto.");
        }

        if (templateName === 'deeptalk-template' && files.length !== 2) {
          throw new Error("DeepTalk Night membutuhkan tepat 2 foto.");
        }

        if (templateName === 'semester-celebration') {
          if (files.length < 3 || files.length > 6) {
            throw new Error("Semester Celebration membutuhkan 3 sampai 6 foto.");
          }
        }
        
        // Pengaturan Kompresi
        const opsiKompresi = {
          maxSizeMB: 0.3,          // Maksimal ukuran file 300KB
          maxWidthOrHeight: 1200,  // Resolusi maksimal 1200px (Sangat cukup untuk polaroid/layar HP)
          useWebWorker: true       // Biar browser tidak nge-lag saat proses kompresi
        };

        for (let i = 0; i < files.length && i < 6; i++) {
          const fileAsli = files[i];
          let fileSiapUpload = fileAsli;

          try {
            if (!isAllowedPhoto(fileAsli)) {
              throw new Error("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
            }

            // Cek apakah library kompresi sudah terpasang di HTML
            if (typeof imageCompression === 'function') {
              btnSubmit.innerHTML = `Mengompres Foto ${i+1}... ⏳`;
              fileSiapUpload = await imageCompression(fileAsli, opsiKompresi);
            }

            // Beberapa library/browser bisa kehilangan MIME type setelah kompresi.
            // Bila kosong, bungkus ulang Blob memakai tipe asli yang sudah tervalidasi.
            if (!fileSiapUpload.type && fileAsli.type) {
              fileSiapUpload = new File(
                [fileSiapUpload],
                fileSiapUpload.name || `foto-${i+1}.jpg`,
                { type: fileAsli.type }
              );
            }

            btnSubmit.innerHTML = `Mengupload Foto ${i+1}... 🚀`;

            linkFotos[i] = await uploadPrivatePhoto({
              file: fileSiapUpload,
              idKado,
              templateName,
              uploadSession
            });

          } catch (compErr) {
            console.error("Gagal memproses/mengupload foto:", compErr);
            const detail = compErr?.message || "Pastikan format gambar valid.";
            throw new Error(`Foto ke-${i+1}: ${detail}`);
          }
        }
      }

      // Pembuatan order sekarang hanya lewat backend terkontrol.
      // Browser tidak menentukan status dan tidak bisa INSERT langsung ke tabel pesanan.
      btnSubmit.innerHTML = 'Memvalidasi & Menyimpan Order... 🔒';

      const { data: orderResult, error: orderError } = await supabaseClient.functions.invoke(
        'create-kado-order',
        {
          body: {
            upload_session: uploadSession,
            id_kado: idKado,
            template: templateName,
            nama_pengirim: namaPengirim,
            nama_penerima: namaPenerima,
            tanggal_jadian: tanggalJadian,
            username,
            password,
            teks_hero: teksHero,
            teks_surat: teksSurat,
            alasan_sayang: alasanSayang,
            caption_1: caption1,
            caption_2: caption2,
            caption_3: caption3,
            caption_4: caption4,
            kupon_judul: kuponJudul,
            kupon_deskripsi: kuponDeskripsi,
            pesan_penutup: pesanPenutup,
            latitude: latBumi,
            longitude: lonBumi,
            link_musik: linkMusikFinal,
            photos: linkFotos.filter(Boolean)
          }
        }
      );

      if (orderError) {
        let detail = "Order belum bisa disimpan.";

        try {
          const context = orderError.context;
          if (context && typeof context.clone === 'function') {
            const payload = await context.clone().json();
            if (payload?.error) detail = String(payload.error);
          }
        } catch (_) {
          // Gunakan pesan aman bila response error tidak bisa dibaca.
        }

        throw new Error(detail);
      }

      if (!orderResult?.success) {
        throw new Error(orderResult?.error || "Order belum bisa disimpan.");
      }

// ===================================================
      // LANJUT KE HALAMAN PEMBAYARAN QRIS
      // ===================================================
      const paymentParams = new URLSearchParams({
        id: idKado,
        template: templateName
      });

      btnSubmit.innerHTML = 'Berhasil! Membuka pembayaran QRIS... ✅';
      window.location.href = `payment.html?${paymentParams.toString()}`;

    } catch (err) {
      alert("Maaf, terjadi kesalahan: " + err.message);
      btnSubmit.innerHTML = 'Simpan & Lanjut Pembayaran 💌';
      btnSubmit.disabled = false;
    }
  });
}
