// =========================================================================
// 1. KONFIGURASI SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// 2. BLUEPRINT FORM DINAMIS (TEMPLATE-SPECIFIC FIELDS)
// =========================================================================
const templateBlueprints = {
  // Template 1: Semester Celebration
  "semester-celebration": `
    <div class="form-card">
      <div class="step-badge">Langkah 2</div>
      <h3>Keamanan & Pesan Kejutan</h3>
      <div class="input-row">
        <div class="input-group">
          <label>Username (Untuk Login) <span>*</span></label>
          <input type="text" id="orderUser" placeholder="Misal: sayang" required>
        </div>
        <div class="input-group">
          <label>Password Login <span>*</span></label>
          <input type="text" id="orderPass" placeholder="Misal: 12345" required>
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
        <label>Upload Foto Kenangan (6 Foto) <span>*</span></label>
        <input type="file" id="fotoKado" accept="image/jpeg, image/png, image/webp" multiple required>
        <small>Pilih maksimal 6 foto sekaligus dari galerimu.</small>
      </div>
      <div class="input-group">
        <label for="selectMusik">Pilih Lagu Background</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="selectMusik" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-family: inherit; font-size: 14px; color: var(--text-dark);">
            <option value="MASUKKAN_LINK_SUPABASE_KAMU_DI_SINI">🎵 Preset 1: Lagu Default KadoDigital</option>
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
  "deeptalk": `
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
            <option value="MASUKKAN_LINK_LAGU_ROMANTIS_DISINI">🎵 Preset 1: Romantis Akustik</option>
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
  `
};

// =========================================================================
// 3. FUNGSI MENAMPILKAN FORM SESUAI PILIHAN
// =========================================================================
function renderFormSesuaiTemplate() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateDipilih = urlParams.get('template');
  const wadah = document.getElementById("wadahFormDinamis");

  if (templateDipilih && templateBlueprints[templateDipilih]) {
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
          }).catch(err => {
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
  } else {
    if(wadah) wadah.innerHTML = `<div class="form-card"><h3 style="color:red; text-align:center;">Silakan pilih template dari Katalog terlebih dahulu!</h3></div>`;
  }
}

// Jalankan saat web dibuka
renderFormSesuaiTemplate();

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
      const templateName = urlParams.get('template') || 'default-template';

      // Data Dasar
      const idKado = document.getElementById('orderId').value.trim().toLowerCase();
      const namaPengirim = document.getElementById('namaPengirim').value.trim();
      const tanggalJadian = document.getElementById('orderTanggal')?.value || null;
      const namaPenerima = document.getElementById('namaPenerima').value.trim();
      
      // Data Login (BARU DITAMBAHKAN)
      const username = document.getElementById('orderUser')?.value.trim() || null;
      const password = document.getElementById('orderPass')?.value.trim() || null;

      // Data Teks
      const teksHero = document.getElementById('teksHero')?.value.trim() || '';
      const teksSurat = document.getElementById('teksSurat')?.value.trim() || '';

      // Data Musik
      const selectMusikVal = document.getElementById('selectMusik')?.value;
      const customMusikVal = document.getElementById('linkMusikCustom')?.value.trim();
      
      let linkMusikFinal = selectMusikVal;
      if (selectMusikVal === 'custom') {
        linkMusikFinal = customMusikVal || null;
      } else if (selectMusikVal && selectMusikVal.includes('MASUKKAN_LINK')) {
        linkMusikFinal = null; 
      }

      // Proses Upload Foto
      const fotoInput = document.getElementById('fotoKado');
      let linkFotos = [null, null, null, null, null, null]; 

      if (fotoInput && fotoInput.files.length > 0) {
        const files = fotoInput.files;
        for (let i = 0; i < files.length && i < 6; i++) {
          const file = files[i];
          const fileName = `${idKado}-${Date.now()}-${i}.${file.name.split('.').pop()}`;

          const { error: uploadError } = await supabaseClient.storage.from('foto_kado').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabaseClient.storage.from('foto_kado').getPublicUrl(fileName);
          linkFotos[i] = publicUrlData.publicUrl;
        }
      }

      // Simpan Semua Data ke Supabase
      const { error } = await supabaseClient.from('pesanan').insert([{
        id_kado: idKado,
        template: templateName,
        nama_pengirim: namaPengirim,
        nama_penerima: namaPenerima,
        tanggal_jadian: tanggalJadian,
        username: username, 
        password: password,
        teks_hero: teksHero,
        teks_surat: teksSurat,
        link_musik: linkMusikFinal,
        link_foto_1: linkFotos[0],
        link_foto_2: linkFotos[1],
        link_foto_3: linkFotos[2],
        link_foto_4: linkFotos[3],
        link_foto_5: linkFotos[4],
        link_foto_6: linkFotos[5],
        status: 'pending'
      }]);

      if (error) {
        if(error.code === '23505') throw new Error("URL Kado ini sudah dipakai orang lain.");
        throw error;
      }

      btnSubmit.innerHTML = 'Berhasil! Mengalihkan ke WhatsApp... ✅';
      window.location.href = `https://wa.me/6282385827645?text=Halo Kak, saya sudah order web kado dengan ID Link: ${idKado}`;

    } catch (err) {
      alert("Maaf, terjadi kesalahan: " + err.message);
      btnSubmit.innerHTML = 'Simpan & Lanjut Pembayaran 💌';
      btnSubmit.disabled = false;
    }
  });
}