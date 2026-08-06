// 1. Konfigurasi Supabase
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Cek Sesi (Apakah Admin sudah login sebelumnya?)
async function checkLoginStatus() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    // Jika sudah ada sesi aktif, langsung buka dashboard
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "block";
    fetchPesanan();
  }
}
// Jalankan pengecekan saat halaman dimuat
checkLoginStatus();

// 3. Fungsi Login dengan Supabase Auth
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("adminEmail").value;
  const pass = document.getElementById("adminPass").value;
  const btnLogin = document.getElementById("btnLogin");
  const errorMsg = document.getElementById("loginError");

  btnLogin.textContent = "Memeriksa...";
  btnLogin.disabled = true;
  errorMsg.style.display = "none";

  // Proses otentikasi ke Supabase
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: pass,
  });

  if (error) {
    errorMsg.textContent = "Gagal login: " + error.message;
    errorMsg.style.display = "block";
    btnLogin.textContent = "Masuk Dashboard";
    btnLogin.disabled = false;
  } else {
    // Login berhasil
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "block";
    fetchPesanan();
  }
});

// 4. Fungsi Logout
async function logoutAdmin() {
  const { error } = await supabaseClient.auth.signOut();
  if (!error) {
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("adminEmail").value = "";
    document.getElementById("adminPass").value = "";
    document.getElementById("btnLogin").textContent = "Masuk Dashboard";
    document.getElementById("btnLogin").disabled = false;
  }
}

// 5. Fungsi Menarik Data Pesanan
async function fetchPesanan() {
  const tbody = document.getElementById("tabelPesanan");
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Sedang memuat data... ⏳</td></tr>";

  try {
    const { data, error } = await supabaseClient
      .from('pesanan')
      .select('id_kado, nama_pengirim, nama_penerima, template, status')
      .order('id', { ascending: false }); // Mengurutkan dari ID terbesar (terbaru)

    if (error) throw error;
    tbody.innerHTML = ""; 

    data.forEach(order => {
      const statusBadge = order.status === 'active' 
        ? `<span class="badge-active">Aktif</span>` 
        : `<span class="badge-pending">Pending</span>`;

      const actionButton = order.status === 'pending'
        ? `<button class="btn-acc" onclick="aktifkanKado('${order.id_kado}')">✅ ACC</button>`
        : `<span style="color:gray; font-size:12px;">Selesai</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${order.id_kado}</strong></td>
        <td>${order.nama_pengirim} ➔ ${order.nama_penerima}</td>
        <td>${order.template}</td>
        <td>${statusBadge}</td>
        <td>${actionButton}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Gagal memuat data!</td></tr>";
  }
}

// 6. Fungsi Mengubah Status Menjadi Active
async function aktifkanKado(idKado) {
  const konfirmasi = confirm(`Yakin ingin mengaktifkan kado dengan ID: ${idKado}?`);
  if (!konfirmasi) return;

  try {
    const { error } = await supabaseClient
      .from('pesanan')
      .update({ status: 'active' })
      .eq('id_kado', idKado);

    if (error) throw error;
    
    // Refresh tabel otomatis
    fetchPesanan();
    
  } catch (err) {
    alert("Terjadi kesalahan: " + err.message);
  }
}