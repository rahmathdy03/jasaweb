// =========================================================================
// 1. INISIALISASI SUPABASE
// =========================================================================
const supabaseClient = window.KadoDigital.createSupabaseClient();


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
// 4. FITUR MANAJEMEN PESANAN
// =========================================================================

const ORDER_SELECT_COLUMNS = [
    'id',
    'created_at',
    'id_kado',
    'template',
    'nama_pengirim',
    'nama_penerima',
    'status',
    'username',
    'tanggal_jadian',
    'teks_hero',
    'teks_surat',
    'link_musik',
    'link_foto_1',
    'link_foto_2',
    'link_foto_3',
    'link_foto_4',
    'link_foto_5',
    'link_foto_6',
    'caption_1',
    'caption_2',
    'caption_3',
    'caption_4',
    'alasan_sayang',
    'kupon_judul',
    'kupon_deskripsi',
    'pesan_penutup'
].join(',');

const adminOrderState = {
    orders: [],
    filters: {
        search: '',
        status: 'all',
        template: 'all'
    }
};

let confirmResolver = null;

function clearElement(element) {
    if (element) element.replaceChildren();
}

function appendTableMessage(tbody, message, { isError = false } = {}) {
    if (!tbody) return;

    clearElement(tbody);

    const row = document.createElement('tr');
    const cell = document.createElement('td');

    cell.colSpan = 6;
    cell.textContent = message;
    cell.style.textAlign = 'center';

    if (isError) {
        cell.style.color = 'var(--danger)';
    }

    row.appendChild(cell);
    tbody.appendChild(row);
}

function cleanOptionalValue(value) {
    if (value === null || value === undefined) return '';

    const text = String(value).trim();
    const lowered = text.toLowerCase();

    if (!text || lowered === 'null' || lowered === 'undefined') return '';
    return text;
}

function normalizeStatus(status) {
    return cleanOptionalValue(status).toLowerCase() || 'pending';
}

const ORDER_STATUS_META = Object.freeze({
    pending: Object.freeze({ label: 'Pending', badgeClass: 'badge-pending' }),
    checking: Object.freeze({ label: 'Checking', badgeClass: 'badge-checking' }),
    active: Object.freeze({ label: 'Active', badgeClass: 'badge-active' }),
    rejected: Object.freeze({ label: 'Rejected', badgeClass: 'badge-rejected' })
});

function getStatusMeta(status) {
    const normalized = normalizeStatus(status);
    return ORDER_STATUS_META[normalized] || {
        label: normalized || 'Unknown',
        badgeClass: 'badge-unknown'
    };
}

function createStatusBadge(status) {
    const meta = getStatusMeta(status);
    const badge = document.createElement('span');

    badge.className = `badge ${meta.badgeClass}`;
    badge.textContent = meta.label;

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

function formatOrderDate(value) {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatTemplateLabel(slug) {
    return String(slug || '-')
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 3800);
}

function setButtonBusy(button, busy, busyText) {
    if (!button) return;

    if (busy) {
        button.dataset.originalText = button.textContent;
        button.textContent = busyText;
        button.disabled = true;
        return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
}

function requestConfirmation({ title, message, confirmText = 'Lanjutkan', danger = false }) {
    const modal = document.getElementById('modal-confirm-action');
    const titleElement = document.getElementById('confirmActionTitle');
    const messageElement = document.getElementById('confirmActionMessage');
    const confirmButton = document.getElementById('confirmActionButton');

    if (!modal || !titleElement || !messageElement || !confirmButton) {
        return Promise.resolve(false);
    }

    if (confirmResolver) {
        confirmResolver(false);
        confirmResolver = null;
    }

    titleElement.textContent = title;
    messageElement.textContent = message;
    confirmButton.textContent = confirmText;
    confirmButton.className = danger ? 'btn-danger-outline' : 'btn-primary';

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    confirmButton.focus();

    return new Promise(resolve => {
        confirmResolver = resolve;
    });
}

function closeConfirmation(result) {
    const modal = document.getElementById('modal-confirm-action');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (confirmResolver) {
        const resolve = confirmResolver;
        confirmResolver = null;
        resolve(result);
    }
}

function countPrivatePhotos(item) {
    let total = 0;

    for (let i = 1; i <= 6; i += 1) {
        if (cleanOptionalValue(item[`link_foto_${i}`])) total += 1;
    }

    return total;
}

function createDetailItem(label, value, { full = false } = {}) {
    const cleanedValue = cleanOptionalValue(value);
    if (!cleanedValue) return null;

    const wrapper = document.createElement('div');
    wrapper.className = `detail-item${full ? ' full' : ''}`;

    const labelElement = document.createElement('span');
    labelElement.className = 'detail-label';
    labelElement.textContent = label;

    const valueElement = document.createElement('div');
    valueElement.className = 'detail-value';
    valueElement.textContent = cleanedValue;

    wrapper.append(labelElement, valueElement);
    return wrapper;
}

function appendDetail(container, label, value, options = {}) {
    const item = createDetailItem(label, value, options);
    if (item) container.appendChild(item);
}

function openOrderDetail(item) {
    const modal = document.getElementById('modal-order-detail');
    const body = document.getElementById('orderDetailBody');
    const subtitle = document.getElementById('orderDetailSubtitle');
    const websiteLink = document.getElementById('detailWebsiteLink');

    if (!modal || !body || !subtitle || !websiteLink) return;

    clearElement(body);

    subtitle.textContent = `ID kado: ${String(item.id_kado || '-')}`;

    appendDetail(body, 'Pengirim', item.nama_pengirim || '-');
    appendDetail(body, 'Penerima', item.nama_penerima || '-');
    appendDetail(body, 'Template', formatTemplateLabel(item.template));
    appendDetail(body, 'Status', getStatusMeta(item.status).label);
    appendDetail(body, 'Tanggal Order', formatOrderDate(item.created_at));
    appendDetail(body, 'Tanggal Jadian / Acara', item.tanggal_jadian);
    appendDetail(body, 'Username Template', item.username);
    appendDetail(body, 'Foto Privat', `${countPrivatePhotos(item)} foto tersimpan`);
    appendDetail(body, 'Kalimat Pembuka', item.teks_hero, { full: true });
    appendDetail(body, 'Surat / Pesan', item.teks_surat, { full: true });
    appendDetail(body, 'Alasan Sayang', item.alasan_sayang, { full: true });

    const captions = [item.caption_1, item.caption_2, item.caption_3, item.caption_4]
        .map(cleanOptionalValue)
        .filter(Boolean)
        .map((value, index) => `${index + 1}. ${value}`)
        .join('\n');

    appendDetail(body, 'Caption / Jawaban Foto', captions, { full: true });

    const coupon = [item.kupon_judul, item.kupon_deskripsi]
        .map(cleanOptionalValue)
        .filter(Boolean)
        .join('\n');

    appendDetail(body, 'Kupon', coupon, { full: true });
    appendDetail(body, 'Pesan Penutup', item.pesan_penutup, { full: true });
    appendDetail(body, 'Musik', cleanOptionalValue(item.link_musik) ? 'Tautan musik tersedia' : 'Tidak ada musik');

    websiteLink.href = buildGiftUrl(item.template, item.id_kado);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeOrderDetail() {
    const modal = document.getElementById('modal-order-detail');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function populateTemplateFilter(data) {
    const select = document.getElementById('templateFilter');
    if (!select) return;

    const previousValue = select.value || adminOrderState.filters.template;
    const templates = [...new Set(
        data
            .map(item => String(item.template || '').trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'id'));

    clearElement(select);

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Semua Template';
    select.appendChild(allOption);

    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template;
        option.textContent = formatTemplateLabel(template);
        select.appendChild(option);
    });

    select.value = templates.includes(previousValue) ? previousValue : 'all';
    adminOrderState.filters.template = select.value;
}

function getFilteredOrders() {
    const search = adminOrderState.filters.search.trim().toLowerCase();
    const status = adminOrderState.filters.status;
    const template = adminOrderState.filters.template;

    return adminOrderState.orders.filter(item => {
        const itemStatus = normalizeStatus(item.status);

        if (status !== 'all' && itemStatus !== status) return false;
        if (template !== 'all' && String(item.template || '') !== template) return false;

        if (!search) return true;

        const haystack = [
            item.id_kado,
            item.nama_pengirim,
            item.nama_penerima,
            item.template
        ]
            .map(value => String(value || '').toLowerCase())
            .join(' ');

        return haystack.includes(search);
    });
}

function applyOrderFilters() {
    renderTabelPesanan(getFilteredOrders());
}

async function fetchPesanan() {
    const tbody = document.getElementById('ordersTableBody');
    const refreshButton = document.getElementById('refreshOrdersBtn');

    appendTableMessage(tbody, 'Mencari data pesanan... ⏳');
    setButtonBusy(refreshButton, true, 'Memuat...');

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .select(ORDER_SELECT_COLUMNS)
            .order('created_at', { ascending: false });

        if (error) throw error;

        adminOrderState.orders = Array.isArray(data) ? data : [];
        populateTemplateFilter(adminOrderState.orders);
        applyOrderFilters();
        renderRecentOrders(adminOrderState.orders);
        updateDashboardStats(adminOrderState.orders);

    } catch (err) {
        console.error(err);
        appendTableMessage(tbody, `Gagal memuat data: ${err.message}`, { isError: true });
        showToast('Pesanan gagal dimuat. Coba refresh kembali.', 'error');
    } finally {
        setButtonBusy(refreshButton, false);
    }
}

function renderTabelPesanan(data) {
    const tbody = document.getElementById('ordersTableBody');
    const resultCount = document.getElementById('orderResultCount');

    if (!tbody) return;

    clearElement(tbody);

    if (resultCount) {
        resultCount.textContent = `${data.length} pesanan ditampilkan`;
    }

    if (data.length === 0) {
        appendTableMessage(tbody, 'Tidak ada pesanan yang cocok dengan filter.');
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        const idStrong = document.createElement('b');
        idStrong.textContent = String(item.id_kado || '-');
        idCell.appendChild(idStrong);

        const clientCell = document.createElement('td');
        const sender = String(item.nama_pengirim || '-');
        const receiver = String(item.nama_penerima || '-');
        clientCell.textContent = `${sender} → ${receiver}`;

        const templateCell = document.createElement('td');
        templateCell.textContent = formatTemplateLabel(item.template);

        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(item.status));

        const dateCell = document.createElement('td');
        dateCell.className = 'order-date';
        dateCell.textContent = formatOrderDate(item.created_at);

        const actionCell = document.createElement('td');
        actionCell.className = 'order-actions';

        actionCell.appendChild(
            createActionButton(
                'btn-edit',
                'Lihat detail pesanan',
                '👁️ Detail',
                () => openOrderDetail(item)
            )
        );

        appendOrderStatusActions(actionCell, item);

        const viewLink = document.createElement('a');
        viewLink.href = buildGiftUrl(item.template, item.id_kado);
        viewLink.target = '_blank';
        viewLink.rel = 'noopener noreferrer';
        viewLink.className = 'btn-sm btn-primary';
        viewLink.title = 'Buka website klien';
        viewLink.textContent = '↗ Website';

        actionCell.appendChild(viewLink);
        actionCell.appendChild(
            createActionButton(
                'btn-del',
                'Hapus permanen',
                '🗑️',
                event => hapusPesanan(item, event.currentTarget)
            )
        );

        row.append(idCell, clientCell, templateCell, statusCell, dateCell, actionCell);
        tbody.appendChild(row);
    });
}

function renderRecentOrders(data) {
    const recentTable = document.querySelector('#sec-dashboard table');
    if (!recentTable) return;

    clearElement(recentTable);

    if (data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'Belum ada pesanan masuk.';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        recentTable.appendChild(row);
        return;
    }

    data.slice(0, 5).forEach(item => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        const idStrong = document.createElement('b');
        idStrong.textContent = String(item.id_kado || '-');
        idCell.appendChild(idStrong);

        const clientCell = document.createElement('td');
        clientCell.textContent = `${String(item.nama_pengirim || '-')} → ${String(item.nama_penerima || '-')}`;

        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(item.status));

        const dateCell = document.createElement('td');
        dateCell.className = 'order-date';
        dateCell.textContent = formatOrderDate(item.created_at);

        row.append(idCell, clientCell, statusCell, dateCell);
        recentTable.appendChild(row);
    });
}

function appendOrderStatusActions(actionCell, item) {
    const status = normalizeStatus(item.status);

    if (status === 'pending') {
        actionCell.appendChild(
            createActionButton(
                'btn-check',
                'Tandai bukti pembayaran sedang diperiksa',
                '🔎 Cek Bukti',
                event => changeOrderStatus(item, 'checking', event.currentTarget)
            )
        );
        return;
    }

    if (status === 'checking') {
        actionCell.appendChild(
            createActionButton(
                'btn-acc',
                'Pembayaran valid dan aktifkan website',
                '✔️ Aktifkan',
                event => changeOrderStatus(item, 'active', event.currentTarget)
            )
        );
        actionCell.appendChild(
            createActionButton(
                'btn-reject',
                'Tolak bukti pembayaran',
                '✖️ Tolak',
                event => changeOrderStatus(item, 'rejected', event.currentTarget)
            )
        );
        return;
    }

    if (status === 'rejected') {
        actionCell.appendChild(
            createActionButton(
                'btn-check',
                'Periksa ulang bukti pembayaran baru',
                '↩️ Periksa Lagi',
                event => changeOrderStatus(item, 'checking', event.currentTarget)
            )
        );
        return;
    }

    if (status === 'active') {
        actionCell.appendChild(
            createActionButton(
                'btn-pause',
                'Nonaktifkan website dan kembalikan ke pending',
                '⏸️ Nonaktifkan',
                event => changeOrderStatus(item, 'pending', event.currentTarget)
            )
        );
    }
}

const STATUS_CHANGE_COPY = Object.freeze({
    'pending:checking': Object.freeze({
        title: 'Periksa Bukti Pembayaran?',
        message: 'Tandai pesanan sebagai Checking karena bukti pembayaran sedang kamu periksa di WhatsApp.',
        confirmText: 'Mulai Periksa',
        toast: 'Status diubah menjadi Checking.'
    }),
    'checking:active': Object.freeze({
        title: 'Aktifkan Pesanan?',
        message: 'Pastikan pembayaran sudah valid. Setelah diaktifkan, website kado pelanggan dapat diakses.',
        confirmText: 'Aktifkan Pesanan',
        toast: 'Pembayaran disetujui dan website berhasil diaktifkan.'
    }),
    'checking:rejected': Object.freeze({
        title: 'Tolak Bukti Pembayaran?',
        message: 'Gunakan status Rejected jika bukti pembayaran tidak valid, nominal salah, atau pelanggan perlu mengirim bukti ulang.',
        confirmText: 'Tolak Bukti',
        toast: 'Bukti pembayaran ditandai Rejected.',
        danger: true
    }),
    'rejected:checking': Object.freeze({
        title: 'Periksa Bukti Baru?',
        message: 'Kembalikan pesanan ke Checking setelah pelanggan mengirim bukti pembayaran baru.',
        confirmText: 'Periksa Lagi',
        toast: 'Pesanan kembali diperiksa.'
    }),
    'active:pending': Object.freeze({
        title: 'Nonaktifkan Website?',
        message: 'Website kado akan berhenti dapat diakses sampai pesanan diaktifkan kembali.',
        confirmText: 'Nonaktifkan',
        toast: 'Website dinonaktifkan dan status kembali Pending.',
        danger: true
    })
});

async function changeOrderStatus(item, nextStatus, button) {
    const currentStatus = normalizeStatus(item.status);
    const transitionKey = `${currentStatus}:${nextStatus}`;
    const copy = STATUS_CHANGE_COPY[transitionKey];

    if (!copy) {
        showToast('Perubahan status ini tidak diizinkan dari dashboard.', 'error');
        return;
    }

    const confirmed = await requestConfirmation({
        title: copy.title,
        message: `${copy.message}\n\nOrder: ${item.id_kado}`,
        confirmText: copy.confirmText,
        danger: Boolean(copy.danger)
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Memproses...');

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .update({ status: nextStatus })
            .eq('id', item.id)
            .eq('status', currentStatus)
            .select('id,status')
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error('Status pesanan sudah berubah. Refresh data lalu coba lagi.');
        }

        showToast(`${item.id_kado}: ${copy.toast}`, nextStatus === 'rejected' ? 'warning' : 'success');
        await fetchPesanan();

    } catch (err) {
        showToast(`Gagal mengubah status: ${err.message}`, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function hapusPesanan(item, button) {
    const confirmed = await requestConfirmation({
        title: 'Hapus Pesanan Permanen?',
        message: `Pesanan ${item.id_kado} akan dihapus dari database. Tindakan ini tidak bisa dibatalkan.\n\nPengelolaan file Storage akan dibenahi pada tahap File & Media.`,
        confirmText: 'Hapus Permanen',
        danger: true
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Menghapus...');

    try {
        const { error } = await supabaseClient
            .from('pesanan')
            .delete()
            .eq('id', item.id);

        if (error) throw error;

        showToast(`Pesanan ${item.id_kado} berhasil dihapus.`, 'warning');
        await fetchPesanan();

    } catch (err) {
        showToast(`Gagal menghapus pesanan: ${err.message}`, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function updateDashboardStats(data) {
    const totalOrder = data.length;
    const activeOrder = data.filter(item => normalizeStatus(item.status) === 'active').length;
    const pendingOrder = data.filter(item => normalizeStatus(item.status) !== 'active').length;

    const statCards = document.querySelectorAll('.stat-card h3');
    if (statCards.length >= 3) {
        statCards[0].textContent = totalOrder;
        statCards[1].textContent = pendingOrder;
        statCards[2].textContent = activeOrder;
    }
}


// =========================================================================
// 5. EVENT LISTENERS KHUSUS MANAJEMEN PESANAN
// =========================================================================

const orderSearchInput = document.getElementById('orderSearch');
const statusFilter = document.getElementById('statusFilter');
const templateFilter = document.getElementById('templateFilter');
const refreshOrdersButton = document.getElementById('refreshOrdersBtn');
const closeOrderDetailButton = document.getElementById('closeOrderDetail');
const closeOrderDetailFooterButton = document.getElementById('closeOrderDetailFooter');
const cancelConfirmButton = document.getElementById('cancelConfirmAction');
const confirmActionButton = document.getElementById('confirmActionButton');

if (orderSearchInput) {
    orderSearchInput.addEventListener('input', event => {
        adminOrderState.filters.search = event.target.value || '';
        applyOrderFilters();
    });
}

if (statusFilter) {
    statusFilter.addEventListener('change', event => {
        adminOrderState.filters.status = event.target.value || 'all';
        applyOrderFilters();
    });
}

if (templateFilter) {
    templateFilter.addEventListener('change', event => {
        adminOrderState.filters.template = event.target.value || 'all';
        applyOrderFilters();
    });
}

if (refreshOrdersButton) {
    refreshOrdersButton.addEventListener('click', fetchPesanan);
}

if (closeOrderDetailButton) {
    closeOrderDetailButton.addEventListener('click', closeOrderDetail);
}

if (closeOrderDetailFooterButton) {
    closeOrderDetailFooterButton.addEventListener('click', closeOrderDetail);
}

if (cancelConfirmButton) {
    cancelConfirmButton.addEventListener('click', () => closeConfirmation(false));
}

if (confirmActionButton) {
    confirmActionButton.addEventListener('click', () => closeConfirmation(true));
}

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    closeOrderDetail();
    closeConfirmation(false);
});

document.getElementById('modal-order-detail')?.addEventListener('click', event => {
    if (event.target.id === 'modal-order-detail') closeOrderDetail();
});

document.getElementById('modal-confirm-action')?.addEventListener('click', event => {
    if (event.target.id === 'modal-confirm-action') closeConfirmation(false);
});
