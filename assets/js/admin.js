// =========================================================================
// 1. INISIALISASI SUPABASE (Menggunakan Kunci Aslimu)
// =========================================================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =========================================================================
// 2. SISTEM OTENTIKASI REAL (Login, Logout, Cek Sesi)
// =========================================================================

// A. Cek Sesi (Apakah Admin sudah login sebelumnya?)
async function checkLoginStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Jika sudah ada sesi aktif, sembunyikan login, tampilkan layout admin baru
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminLayout").style.display = "flex"; 
        fetchPesanan(); // Langsung tarik data
    }
}
checkLoginStatus(); // Jalankan saat halaman dimuat

// B. Fungsi Login (Dipanggil dari form HTML onsubmit="handleLogin(event)")
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById("adminEmail").value;
    const pass = document.getElementById("adminPass").value;
    const btnLogin = document.querySelector("#adminLoginForm button");
    const errorMsg = document.getElementById("loginError");

    btnLogin.textContent = "Memeriksa Kredensial...";
    btnLogin.disabled = true;
    errorMsg.style.display = "none";

    // Proses otentikasi ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
    });

    if (error) {
        errorMsg.textContent = "Gagal login: " + error.message;
        errorMsg.style.display = "block";
        btnLogin.textContent = "Masuk Dashboard";
        btnLogin.disabled = false;
    } else {
        // Login berhasil!
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminLayout").style.display = "flex";
        btnLogin.textContent = "Masuk Dashboard";
        btnLogin.disabled = false;
        fetchPesanan(); // Tarik data pesanan
    }
}

// C. Fungsi Logout (Dipanggil dari tombol sidebar onclick="handleLogout()")
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        document.getElementById("adminLayout").style.display = "none";
        document.getElementById("loginSection").style.display = "flex"; // Kembali ke layar login
        document.getElementById("adminLoginForm").reset();
    } else {
        alert("Terjadi kesalahan saat logout: " + error.message);
    }
}


// =========================================================================
// 3. NAVIGASI UI DASHBOARD (Pindah antar Menu)
// =========================================================================
function switchMenu(menuId) {
    // Ganti warna menu sidebar
    document.querySelectorAll('.sidebar-menu li').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Ganti tampilan konten section
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('sec-' + menuId).classList.add('active');
    
    // Ganti judul atas
    const titles = {
        'dashboard': 'Dashboard Ringkasan',
        'pesanan': 'Manajemen Pesanan',
        'template': 'Katalog Template',
        'media': 'Penyimpanan File'
    };
    document.getElementById('pageTitle').innerText = titles[menuId];
}

// Untuk buka/tutup form Pop-up
function toggleModal(modalId) {
    document.getElementById(modalId).classList.toggle('active');
}


// =========================================================================
// 4. FITUR MANAJEMEN PESANAN (Tarik, ACC, Hapus Data)
// =========================================================================

// A. Mengambil data dari tabel 'pesanan'
async function fetchPesanan() {
    const tbody = document.querySelector('#sec-pesanan tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Mencari data pesanan... ⏳</td></tr>';

    try {
        const { data, error } = await supabase
            .from('pesanan')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTabelPesanan(data);
        updateDashboardStats(data); // Hitung statistik untuk Dashboard

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger); text-align:center;">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

// B. Mencetak data ke tabel HTML
function renderTabelPesanan(data) {
    const tbody = document.querySelector('#sec-pesanan tbody');
    tbody.innerHTML = ''; 

    // Tampilkan 5 pesanan terbaru di Ringkasan (Dashboard)
    const recentTable = document.querySelector('#sec-dashboard table');
    recentTable.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada pesanan masuk.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        // --- 1. Cetak ke Tabel Utama (Tab Pesanan) ---
        const statusBadge = item.status === 'active' 
            ? `<span class="badge badge-active">Active</span>` 
            : `<span class="badge badge-pending">Pending</span>`;

        const btnAcc = item.status !== 'active'
            ? `<button class="btn-sm btn-acc" onclick="accPesanan('${item.id}')" title="Aktifkan">✔️ ACC</button>`
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${item.id}</b></td>
            <td>${item.nama_panggilan_pria || 'Klien'} & ${item.nama_panggilan_wanita || '?'}</td>
            <td>${item.template_id || 'Our Story'}</td>
            <td>${statusBadge}</td>
            <td>
                ${btnAcc}
                <a href="/templates/pasangan/our-story-anniversary/index.html?id=${item.id}" target="_blank">
                    <button class="btn-sm btn-edit" title="Lihat Website Klien">👁️ View</button>
                </a>
                <button class="btn-sm btn-del" onclick="hapusPesanan('${item.id}')" title="Hapus Permanen">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);

        // --- 2. Cetak ke Tabel Aktivitas Terbaru (Maksimal 5) ---
        if (index < 5) {
            const trRecent = document.createElement('tr');
            trRecent.innerHTML = `
                <td><b>${item.id}</b></td>
                <td>${item.nama_panggilan_pria || 'Klien'} & ${item.nama_panggilan_wanita || '?'}</td>
                <td>${statusBadge}</td>
            `;
            recentTable.appendChild(trRecent);
        }
    });
}

// C. Mengubah Status (Pending -> Active)
async function accPesanan(id) {
    if (!confirm(`Yakin ingin ACC pesanan ${id}? Website klien akan bisa diakses.`)) return;

    try {
        const { error } = await supabase
            .from('pesanan')
            .update({ status: 'active' })
            .eq('id', id);

        if (error) throw error;
        alert('✅ Pesanan berhasil diaktifkan!');
        fetchPesanan(); // Refresh data

    } catch (err) {
        alert('Gagal mengaktifkan pesanan: ' + err.message);
    }
}

// D. Menghapus Pesanan
async function hapusPesanan(id) {
    if (!confirm(`TINDAKAN PERMANEN!\nYakin ingin menghapus seluruh data kado milik ${id}?`)) return;

    try {
        const { error } = await supabase
            .from('pesanan')
            .delete()
            .eq('id', id);

        if (error) throw error;
        alert('🗑️ Data berhasil dihapus permanen!');
        fetchPesanan(); // Refresh data

    } catch (err) {
        alert('Gagal menghapus data: ' + err.message);
    }
}

// E. Hitung & Update Statistik Dashboard Utama
function updateDashboardStats(data) {
    const totalOrder = data.length;
    const activeOrder = data.filter(d => d.status === 'active').length;
    const pendingOrder = data.filter(d => d.status !== 'active').length;

    const statCards = document.querySelectorAll('.stat-card h3');
    if(statCards.length >= 3) {
        statCards[0].innerText = totalOrder;
        statCards[1].innerText = pendingOrder;
        statCards[2].innerText = activeOrder;
    }
}
