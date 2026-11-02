// =========================================================================
// 1. INISIALISASI SUPABASE (Menggunakan Kunci Aslimu)
// =========================================================================
const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';

// UBAH NAMA VARIABEL JADI supabaseClient AGAR TIDAK BENTROK (ERROR)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =========================================================================
// 2. SISTEM OTENTIKASI REAL (Login, Logout, Cek Sesi)
// =========================================================================

function isAdminUser(user) {
    return user?.app_metadata?.role === 'admin';
}

async function checkLoginStatus() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (!error && isAdminUser(user)) {
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminLayout").style.display = "flex";
        fetchPesanan();
        return;
    }

    document.getElementById("adminLayout").style.display = "none";
    document.getElementById("loginSection").style.display = "flex";

    // Jika ada sesi user biasa, keluarkan agar dashboard tidak terlihat sebagai admin.
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) await supabaseClient.auth.signOut();
}
checkLoginStatus();

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("adminEmail").value;
    const pass = document.getElementById("adminPass").value;
    const btnLogin = document.querySelector("#adminLoginForm button");
    const errorMsg = document.getElementById("loginError");

    btnLogin.textContent = "Memeriksa Kredensial...";
    btnLogin.disabled = true;
    errorMsg.style.display = "none";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
    });

    if (error || !isAdminUser(data.user)) {
        if (!error) await supabaseClient.auth.signOut();

        errorMsg.textContent = error
            ? "Gagal login: " + error.message
            : "Akun ini tidak memiliki akses admin.";
        errorMsg.style.display = "block";
        btnLogin.textContent = "Masuk Dashboard";
        btnLogin.disabled = false;
        return;
    }

    document.getElementById("loginSection").style.display = "none";
    document.getElementById("adminLayout").style.display = "flex";
    btnLogin.textContent = "Masuk Dashboard";
    btnLogin.disabled = false;
    fetchPesanan();
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        document.getElementById("adminLayout").style.display = "none";
        document.getElementById("loginSection").style.display = "flex"; 
        document.getElementById("adminLoginForm").reset();
    } else {
        alert("Terjadi kesalahan saat logout: " + error.message);
    }
}


// =========================================================================
// 3. NAVIGASI UI DASHBOARD (Pindah antar Menu)
// =========================================================================
function switchMenu(menuId) {
    document.querySelectorAll('.sidebar-menu li').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('sec-' + menuId).classList.add('active');
    
    const titles = {
        'dashboard': 'Dashboard Ringkasan',
        'pesanan': 'Manajemen Pesanan',
        'template': 'Katalog Template',
        'media': 'Penyimpanan File'
    };
    document.getElementById('pageTitle').innerText = titles[menuId];
}

function toggleModal(modalId) {
    document.getElementById(modalId).classList.toggle('active');
}


// =========================================================================
// 4. FITUR MANAJEMEN PESANAN (Tarik, ACC, Hapus Data)
// =========================================================================

function clearElement(element) {
    element.replaceChildren();
}

function appendTableMessage(tbody, message, { isError = false } = {}) {
    clearElement(tbody);

    const row = document.createElement('tr');
    const cell = document.createElement('td');

    cell.colSpan = 5;
    cell.textContent = message;
    cell.style.textAlign = 'center';

    if (isError) {
        cell.style.color = 'var(--danger)';
    }

    row.appendChild(cell);
    tbody.appendChild(row);
}

function createStatusBadge(status) {
    const badge = document.createElement('span');
    const isActive = status === 'active';

    badge.className = `badge ${isActive ? 'badge-active' : 'badge-pending'}`;
    badge.textContent = isActive ? 'Active' : 'Pending';

    return badge;
}

function createActionButton(className, title, text, handler) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = `btn-sm ${className}`;
    button.title = title;
    button.textContent = text;
    button.addEventListener('click', handler);

    return button;
}

function buildGiftUrl(template, idKado) {
    const safeTemplate = encodeURIComponent(String(template ?? ''));
    const safeIdKado = encodeURIComponent(String(idKado ?? ''));

    return `/templates/pasangan/${safeTemplate}/index.html?id=${safeIdKado}`;
}

async function fetchPesanan() {
    const tbody = document.querySelector('#sec-pesanan tbody');
    appendTableMessage(tbody, 'Mencari data pesanan... ⏳');

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTabelPesanan(data);
        updateDashboardStats(data);

    } catch (err) {
        console.error(err);
        appendTableMessage(tbody, `Gagal memuat data: ${err.message}`, { isError: true });
    }
}

// B. Mencetak data ke tabel HTML tanpa menyisipkan data user melalui innerHTML.
function renderTabelPesanan(data) {
    const tbody = document.querySelector('#sec-pesanan tbody');
    const recentTable = document.querySelector('#sec-dashboard table');

    clearElement(tbody);
    clearElement(recentTable);

    if (data.length === 0) {
        appendTableMessage(tbody, 'Belum ada pesanan masuk.');
        return;
    }

    data.forEach((item, index) => {
        // --- 1. Tabel utama ---
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        const idStrong = document.createElement('b');
        idStrong.textContent = String(item.id_kado ?? '');
        idCell.appendChild(idStrong);

        const clientCell = document.createElement('td');
        clientCell.textContent = `${String(item.nama_pengirim ?? '')} & ${String(item.nama_penerima ?? '')}`;

        const templateCell = document.createElement('td');
        templateCell.textContent = String(item.template ?? '');
        templateCell.style.textTransform = 'capitalize';

        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(item.status));

        const actionCell = document.createElement('td');

        if (item.status !== 'active') {
            actionCell.appendChild(
                createActionButton(
                    'btn-acc',
                    'Aktifkan',
                    '✔️ ACC',
                    () => accPesanan(item.id)
                )
            );
        }

        const viewLink = document.createElement('a');
        viewLink.href = buildGiftUrl(item.template, item.id_kado);
        viewLink.target = '_blank';
        viewLink.rel = 'noopener noreferrer';

        const viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.className = 'btn-sm btn-edit';
        viewButton.title = 'Lihat Website Klien';
        viewButton.textContent = '👁️ View';
        viewLink.appendChild(viewButton);

        actionCell.appendChild(viewLink);
        actionCell.appendChild(
            createActionButton(
                'btn-del',
                'Hapus Permanen',
                '🗑️',
                () => hapusPesanan(item.id)
            )
        );

        row.append(idCell, clientCell, templateCell, statusCell, actionCell);
        tbody.appendChild(row);

        // --- 2. Aktivitas terbaru ---
        if (index < 5) {
            const recentRow = document.createElement('tr');

            const recentId = document.createElement('td');
            const recentIdStrong = document.createElement('b');
            recentIdStrong.textContent = String(item.id_kado ?? '');
            recentId.appendChild(recentIdStrong);

            const recentClient = document.createElement('td');
            recentClient.textContent = `${String(item.nama_pengirim ?? '')} & ${String(item.nama_penerima ?? '')}`;

            const recentStatus = document.createElement('td');
            recentStatus.appendChild(createStatusBadge(item.status));

            recentRow.append(recentId, recentClient, recentStatus);
            recentTable.appendChild(recentRow);
        }
    });
}

async function accPesanan(id) {
    if (!confirm(`Yakin ingin ACC pesanan ${id}? Website klien akan bisa diakses.`)) return;

    try {
        const { error } = await supabaseClient
            .from('pesanan')
            .update({ status: 'active' })
            .eq('id', id);

        if (error) throw error;
        alert('✅ Pesanan berhasil diaktifkan!');
        fetchPesanan(); 

    } catch (err) {
        alert('Gagal mengaktifkan pesanan: ' + err.message);
    }
}

async function hapusPesanan(id) {
    if (!confirm(`TINDAKAN PERMANEN!\nYakin ingin menghapus seluruh data kado milik ${id}?`)) return;

    try {
        const { error } = await supabaseClient
            .from('pesanan')
            .delete()
            .eq('id', id);

        if (error) throw error;
        alert('🗑️ Data berhasil dihapus permanen!');
        fetchPesanan(); 

    } catch (err) {
        alert('Gagal menghapus data: ' + err.message);
    }
}

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
