// =========================================================================
// 1. INISIALISASI SUPABASE
// =========================================================================
const supabaseClient = window.KadoDigital.createSupabaseClient();


// =========================================================================
// 2. SISTEM OTENTIKASI REAL (Login, Logout, Cek Sesi)
// =========================================================================

let dashboardRefreshTimer = null;

function isAdminUser(user) {
    return user?.app_metadata?.role === 'admin';
}

function stopDashboardAutoRefresh() {
    if (!dashboardRefreshTimer) return;

    window.clearInterval(dashboardRefreshTimer);
    dashboardRefreshTimer = null;
}

function startDashboardAutoRefresh() {
    stopDashboardAutoRefresh();

    dashboardRefreshTimer = window.setInterval(() => {
        const layout = document.getElementById('adminLayout');
        const adminVisible = layout && layout.style.display !== 'none';

        if (document.visibilityState === 'visible' && adminVisible) {
            fetchPesanan();
        }
    }, 60 * 1000);
}

async function checkLoginStatus() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (!error && isAdminUser(user)) {
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminLayout").style.display = "flex";
        fetchPesanan();
        fetchTemplates();
        fetchStorageSnapshot();
        startDashboardAutoRefresh();
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
    fetchTemplates();
    fetchStorageSnapshot();
    startDashboardAutoRefresh();
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        stopDashboardAutoRefresh();
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

const adminDashboardState = {
    templateCount: null,
    templateCountPromise: null
};

const TEMPLATE_SELECT_COLUMNS = [
    'slug',
    'name',
    'collection',
    'category_label',
    'secondary_label',
    'description',
    'thumbnail_url',
    'folder',
    'preview_id',
    'demo_hint',
    'status',
    'featured',
    'sort_order',
    'source_ready',
    'handler_key',
    'min_photos',
    'max_photos',
    'created_at',
    'updated_at'
].join(',');

const adminTemplateState = {
    templates: [],
    editingSlug: null
};

const adminStorageState = {
    files: [],
    summary: null,
    filters: {
        search: '',
        status: 'all'
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
    rejected: Object.freeze({ label: 'Rejected', badgeClass: 'badge-rejected' }),
    archived: Object.freeze({ label: 'Archived', badgeClass: 'badge-archived' })
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

    const detailStatus = normalizeStatus(item.status);
    const canOpenWebsite = detailStatus === 'pending' || detailStatus === 'active';

    websiteLink.href = canOpenWebsite ? buildGiftUrl(item.template, item.id_kado) : '#';
    websiteLink.style.display = canOpenWebsite ? 'inline-flex' : 'none';

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

        if (status === 'all' && itemStatus === 'archived') return false;
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

async function fetchPesanan({ refreshTemplateCount = false } = {}) {
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
        void loadTemplateCount({ force: refreshTemplateCount });

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

        const itemStatus = normalizeStatus(item.status);

        if (itemStatus === 'pending' || itemStatus === 'active') {
            const viewLink = document.createElement('a');
            viewLink.href = buildGiftUrl(item.template, item.id_kado);
            viewLink.target = '_blank';
            viewLink.rel = 'noopener noreferrer';
            viewLink.className = 'btn-sm btn-primary';
            viewLink.title = 'Buka website klien';
            viewLink.textContent = '↗ Website';

            actionCell.appendChild(viewLink);
        }
        row.append(idCell, clientCell, templateCell, statusCell, dateCell, actionCell);
        tbody.appendChild(row);
    });
}

function renderRecentOrders(data) {
    const recentTable = document.querySelector('#sec-dashboard table');
    const visibleData = data.filter(item => normalizeStatus(item.status) !== 'archived');
    if (!recentTable) return;

    clearElement(recentTable);

    if (visibleData.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'Belum ada pesanan masuk.';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        recentTable.appendChild(row);
        return;
    }

    visibleData.slice(0, 5).forEach(item => {
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
    } else if (status === 'checking') {
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
    } else if (status === 'rejected') {
        actionCell.appendChild(
            createActionButton(
                'btn-check',
                'Periksa ulang bukti pembayaran baru',
                '↩️ Periksa Lagi',
                event => changeOrderStatus(item, 'checking', event.currentTarget)
            )
        );
    } else if (status === 'active') {
        actionCell.appendChild(
            createActionButton(
                'btn-pause',
                'Nonaktifkan website dan kembalikan ke pending',
                '⏸️ Nonaktifkan',
                event => changeOrderStatus(item, 'pending', event.currentTarget)
            )
        );
    }

    if (status === 'archived') {
        actionCell.appendChild(
            createActionButton(
                'btn-restore',
                'Pulihkan order ke Pending',
                '♻️ Pulihkan',
                event => restoreArchivedOrder(item, event.currentTarget)
            )
        );

        actionCell.appendChild(
            createActionButton(
                'btn-del',
                'Hapus permanen order dan file privatnya',
                '🗑️ Permanen',
                event => deleteArchivedOrder(item, event.currentTarget)
            )
        );
    } else {
        actionCell.appendChild(
            createActionButton(
                'btn-archive',
                'Pindahkan order ke arsip',
                '📦 Arsipkan',
                event => archiveOrder(item, event.currentTarget)
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

async function archiveOrder(item, button) {
    const currentStatus = normalizeStatus(item.status);

    if (currentStatus === 'archived') return;

    const confirmed = await requestConfirmation({
        title: 'Arsipkan Pesanan?',
        message: `Pesanan ${item.id_kado} akan dipindahkan ke arsip.\n\nWebsite pelanggan tidak akan bisa diakses selama order berada di arsip.`,
        confirmText: 'Arsipkan Pesanan',
        danger: true
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Mengarsipkan...');

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .update({ status: 'archived' })
            .eq('id', item.id)
            .eq('status', currentStatus)
            .select('id,status')
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error('Status pesanan sudah berubah. Refresh data lalu coba lagi.');
        }

        showToast(`Pesanan ${item.id_kado} dipindahkan ke arsip.`, 'warning');
        await fetchPesanan();

    } catch (err) {
        showToast(`Gagal mengarsipkan pesanan: ${err.message}`, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function restoreArchivedOrder(item, button) {
    const confirmed = await requestConfirmation({
        title: 'Pulihkan Pesanan?',
        message: `Pesanan ${item.id_kado} akan dipulihkan ke status Pending agar bisa diperiksa ulang sebelum diaktifkan.`,
        confirmText: 'Pulihkan ke Pending'
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Memulihkan...');

    try {
        const { data, error } = await supabaseClient
            .from('pesanan')
            .update({ status: 'pending' })
            .eq('id', item.id)
            .eq('status', 'archived')
            .select('id,status')
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error('Pesanan sudah tidak berada di arsip. Refresh data lalu coba lagi.');
        }

        showToast(`Pesanan ${item.id_kado} dipulihkan ke Pending.`, 'success');
        await fetchPesanan();

    } catch (err) {
        showToast(`Gagal memulihkan pesanan: ${err.message}`, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function readFunctionError(error, fallback) {
    try {
        const context = error?.context;
        if (context && typeof context.clone === 'function') {
            const payload = await context.clone().json();
            if (payload?.error) return String(payload.error);
        }
    } catch (_) {
        // Gunakan fallback bila response function tidak bisa dibaca.
    }

    return error?.message || fallback;
}

async function deleteArchivedOrder(item, button) {
    const confirmed = await requestConfirmation({
        title: 'Hapus Permanen?',
        message: `Pesanan ${item.id_kado} akan dihapus permanen dari database.\n\nFile privat modern di folder order juga akan dibersihkan. Tindakan ini tidak bisa dibatalkan.`,
        confirmText: 'Hapus Permanen',
        danger: true
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Menghapus...');

    try {
        const { data, error } = await supabaseClient.functions.invoke(
            'admin-delete-kado',
            {
                body: { id: item.id }
            }
        );

        if (error) {
            throw new Error(await readFunctionError(error, 'Penghapusan permanen gagal.'));
        }

        if (!data?.success) {
            throw new Error(data?.error || 'Penghapusan permanen gagal.');
        }

        const warnings = Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : [];

        if (warnings.length) {
            showToast(
                `Pesanan dihapus, tetapi ada catatan cleanup: ${warnings.join(' ')}`,
                'warning'
            );
        } else {
            const deletedFiles = Number(data.storage_deleted || 0);
            showToast(
                `Pesanan ${item.id_kado} dihapus permanen. ${deletedFiles} file privat dibersihkan.`,
                'success'
            );
        }

        await fetchPesanan();

    } catch (err) {
        showToast(`Gagal menghapus permanen: ${err.message}`, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function getJakartaDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, part.value])
    );

    if (!values.year || !values.month || !values.day) return '';
    return `${values.year}-${values.month}-${values.day}`;
}

function setDashboardStat(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

function updateDashboardStats(data) {
    const nonArchived = data.filter(item => normalizeStatus(item.status) !== 'archived');
    const todayKey = getJakartaDateKey();

    const totalOrder = nonArchived.length;
    const needsAttention = nonArchived.filter(item => {
        const status = normalizeStatus(item.status);
        return status === 'pending' || status === 'checking';
    }).length;
    const activeOrder = nonArchived.filter(
        item => normalizeStatus(item.status) === 'active'
    ).length;
    const ordersToday = nonArchived.filter(
        item => getJakartaDateKey(item.created_at) === todayKey
    ).length;
    const rejectedOrder = nonArchived.filter(
        item => normalizeStatus(item.status) === 'rejected'
    ).length;
    const archivedOrder = data.filter(
        item => normalizeStatus(item.status) === 'archived'
    ).length;

    setDashboardStat('statTotalOrders', totalOrder);
    setDashboardStat('statNeedsAttention', needsAttention);
    setDashboardStat('statActiveOrders', activeOrder);
    setDashboardStat('statOrdersToday', ordersToday);
    setDashboardStat('statRejectedOrders', rejectedOrder);
    setDashboardStat('statArchivedOrders', archivedOrder);
}

function renderTemplateCount(value) {
    setDashboardStat(
        'statTemplateCount',
        Number.isInteger(value) && value >= 0 ? value : '—'
    );
}

async function loadTemplateCount({ force = false } = {}) {
    if (!force && Number.isInteger(adminDashboardState.templateCount)) {
        renderTemplateCount(adminDashboardState.templateCount);
        return adminDashboardState.templateCount;
    }

    if (adminDashboardState.templateCountPromise) {
        return adminDashboardState.templateCountPromise;
    }

    adminDashboardState.templateCountPromise = (async () => {
        const { count, error } = await supabaseClient
            .from('templates')
            .select('slug', { count: 'exact', head: true })
            .eq('status', 'published');

        if (error) throw error;

        const value = Number(count || 0);
        adminDashboardState.templateCount = value;
        renderTemplateCount(value);
        return value;
    })()
        .catch(error => {
            console.warn('Gagal menghitung template published:', error);
            renderTemplateCount(null);
            return null;
        })
        .finally(() => {
            adminDashboardState.templateCountPromise = null;
        });

    return adminDashboardState.templateCountPromise;
}


// =========================================================================
// 5. TEMPLATE REGISTRY / CRUD
// =========================================================================

function appendTemplateTableMessage(message, { isError = false } = {}) {
    const tbody = document.getElementById('templatesTableBody');
    if (!tbody) return;

    clearElement(tbody);

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'template-empty';
    cell.textContent = message;

    if (isError) cell.style.color = 'var(--danger)';

    row.appendChild(cell);
    tbody.appendChild(row);
}

function createTemplateStatusBadge(status) {
    const normalized = String(status || 'draft').toLowerCase();
    const badge = document.createElement('span');

    badge.className = 'badge';
    if (normalized === 'published') {
        badge.classList.add('badge-active');
        badge.textContent = 'Published';
    } else if (normalized === 'unpublished') {
        badge.classList.add('badge-rejected');
        badge.textContent = 'Unpublished';
    } else {
        badge.classList.add('badge-pending');
        badge.textContent = 'Draft';
    }

    return badge;
}

function templatePreviewUrl(item) {
    if (!item?.source_ready || !item?.preview_id) return '#';

    const folder = encodeURIComponent(String(item.folder || 'pasangan'));
    const slug = encodeURIComponent(String(item.slug || ''));
    const previewId = encodeURIComponent(String(item.preview_id || ''));

    return `/templates/${folder}/${slug}/index.html?id=${previewId}`;
}

function renderTemplates(data) {
    const tbody = document.getElementById('templatesTableBody');
    const count = document.getElementById('templateResultCount');
    if (!tbody) return;

    clearElement(tbody);

    if (count) count.textContent = `${data.length} template`;

    if (!data.length) {
        appendTemplateTableMessage('Belum ada template di registry.');
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const previewCell = document.createElement('td');
        const image = document.createElement('img');
        image.className = 'template-thumb';
        image.src = String(item.thumbnail_url || '');
        image.alt = `Preview ${item.name || item.slug || 'template'}`;
        image.loading = 'lazy';
        previewCell.appendChild(image);

        const nameCell = document.createElement('td');
        const name = document.createElement('div');
        name.className = 'template-title';
        name.textContent = String(item.name || '-');
        const slug = document.createElement('div');
        slug.className = 'template-slug';
        slug.textContent = String(item.slug || '-');
        nameCell.append(name, slug);

        const categoryCell = document.createElement('td');
        categoryCell.textContent = [item.category_label, item.secondary_label]
            .map(cleanOptionalValue)
            .filter(Boolean)
            .join(' · ') || '-';

        const statusCell = document.createElement('td');
        statusCell.appendChild(createTemplateStatusBadge(item.status));

        const sourceCell = document.createElement('td');
        const source = document.createElement('span');
        source.className = `template-source${item.source_ready ? '' : ' not-ready'}`;
        source.textContent = item.source_ready ? '✓ Source ready' : 'Draft metadata';
        sourceCell.appendChild(source);

        const sortCell = document.createElement('td');
        sortCell.textContent = String(item.sort_order ?? 100);

        const actionCell = document.createElement('td');
        actionCell.className = 'template-actions';

        actionCell.appendChild(
            createActionButton(
                'btn-edit',
                'Edit metadata template',
                '✏️ Edit',
                () => openTemplateModal(item)
            )
        );

        if (item.source_ready && item.preview_id) {
            const previewLink = document.createElement('a');
            previewLink.href = templatePreviewUrl(item);
            previewLink.target = '_blank';
            previewLink.rel = 'noopener noreferrer';
            previewLink.className = 'btn-sm btn-primary';
            previewLink.textContent = '↗ Preview';
            actionCell.appendChild(previewLink);
        }

        if (item.source_ready) {
            const nextStatus = item.status === 'published' ? 'unpublished' : 'published';
            const label = item.status === 'published' ? '⏸ Unpublish' : '🚀 Publish';
            const className = item.status === 'published' ? 'btn-pause' : 'btn-acc';

            actionCell.appendChild(
                createActionButton(
                    className,
                    label,
                    label,
                    event => quickTemplateStatus(item, nextStatus, event.currentTarget)
                )
            );
        }

        if (!item.source_ready) {
            actionCell.appendChild(
                createActionButton(
                    'btn-del',
                    'Hapus draft template',
                    '🗑️',
                    event => deleteTemplate(item, event.currentTarget)
                )
            );
        }

        row.append(
            previewCell,
            nameCell,
            categoryCell,
            statusCell,
            sourceCell,
            sortCell,
            actionCell
        );
        tbody.appendChild(row);
    });
}

async function fetchTemplates() {
    appendTemplateTableMessage('Memuat template...');

    try {
        const { data, error } = await supabaseClient
            .from('templates')
            .select(TEMPLATE_SELECT_COLUMNS)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw error;

        adminTemplateState.templates = Array.isArray(data) ? data : [];
        renderTemplates(adminTemplateState.templates);

        const publishedCount = adminTemplateState.templates.filter(
            item => item.status === 'published'
        ).length;

        adminDashboardState.templateCount = publishedCount;
        renderTemplateCount(publishedCount);
    } catch (error) {
        console.error(error);
        appendTemplateTableMessage(
            `Gagal memuat template: ${error.message}`,
            { isError: true }
        );
        showToast('Katalog template gagal dimuat.', 'error');
    }
}

function openTemplateModal(item = null) {
    const modal = document.getElementById('modal-template');
    const form = document.getElementById('templateForm');
    if (!modal || !form) return;

    adminTemplateState.editingSlug = item?.slug || null;
    form.reset();

    const editing = Boolean(item);
    document.getElementById('templateModalTitle').textContent = editing
        ? 'Edit Template'
        : 'Tambah Template';
    document.getElementById('templateModalSubtitle').textContent = editing
        ? 'Perubahan metadata dan status publikasi akan mengikuti registry template.'
        : 'Template baru otomatis disimpan sebagai Draft sampai source code-nya siap.';

    const slugInput = document.getElementById('templateSlug');
    slugInput.value = item?.slug || '';
    slugInput.disabled = editing;

    document.getElementById('templateName').value = item?.name || '';
    document.getElementById('templateCollection').value = item?.collection || 'pasangan';
    document.getElementById('templateCategory').value = item?.category_label || '';
    document.getElementById('templateSecondaryLabel').value = item?.secondary_label || '';
    document.getElementById('templateSortOrder').value = String(item?.sort_order ?? 100);
    document.getElementById('templateDescription').value = item?.description || '';
    document.getElementById('templateThumbnail').value = item?.thumbnail_url || '';
    document.getElementById('templateFolder').value = item?.folder || 'pasangan';
    document.getElementById('templatePreviewId').value = item?.preview_id || '';
    document.getElementById('templateDemoHint').value = item?.demo_hint || '';
    document.getElementById('templateFeatured').checked = Boolean(item?.featured);

    const statusSelect = document.getElementById('templateStatus');
    const statusHelp = document.getElementById('templateStatusHelp');
    statusSelect.value = item?.status || 'draft';
    statusSelect.disabled = !editing;
    statusHelp.textContent = !editing
        ? 'Template baru selalu dibuat sebagai Draft.'
        : item?.source_ready
            ? 'Source siap: template ini boleh Published atau Unpublished.'
            : 'Belum source-ready: template harus tetap Draft/Unpublished.';

    const folderInput = document.getElementById('templateFolder');
    folderInput.disabled = Boolean(item?.source_ready);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeTemplateModal() {
    const modal = document.getElementById('modal-template');
    const form = document.getElementById('templateForm');

    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (form) form.reset();
    adminTemplateState.editingSlug = null;
}

function templateFormPayload() {
    const editingSlug = adminTemplateState.editingSlug;
    return {
        slug: editingSlug || document.getElementById('templateSlug').value.trim().toLowerCase(),
        name: document.getElementById('templateName').value.trim(),
        collection: document.getElementById('templateCollection').value.trim().toLowerCase(),
        category_label: document.getElementById('templateCategory').value.trim(),
        secondary_label: document.getElementById('templateSecondaryLabel').value.trim(),
        sort_order: Number(document.getElementById('templateSortOrder').value || 100),
        description: document.getElementById('templateDescription').value.trim(),
        thumbnail_url: document.getElementById('templateThumbnail').value.trim(),
        folder: document.getElementById('templateFolder').value.trim().toLowerCase(),
        preview_id: document.getElementById('templatePreviewId').value.trim().toLowerCase(),
        demo_hint: document.getElementById('templateDemoHint').value.trim(),
        status: document.getElementById('templateStatus').value,
        featured: document.getElementById('templateFeatured').checked
    };
}

function fullTemplateMutationPayload(item, status = item.status) {
    return {
        slug: item.slug,
        name: item.name,
        collection: item.collection,
        category_label: item.category_label,
        secondary_label: item.secondary_label || '',
        description: item.description,
        thumbnail_url: item.thumbnail_url,
        folder: item.folder,
        preview_id: item.preview_id || '',
        demo_hint: item.demo_hint || '',
        status,
        featured: Boolean(item.featured),
        sort_order: Number(item.sort_order ?? 100)
    };
}

async function invokeTemplateMutation(action, template) {
    const { data, error } = await supabaseClient.functions.invoke(
        'admin-template-mutate',
        { body: { action, template } }
    );

    if (error) {
        throw new Error(await readFunctionError(error, 'Perubahan template gagal.'));
    }

    if (!data?.success) {
        throw new Error(data?.error || 'Perubahan template gagal.');
    }

    return data;
}

async function saveTemplate(event) {
    event.preventDefault();

    const button = document.getElementById('saveTemplateButton');
    const action = adminTemplateState.editingSlug ? 'update' : 'create';
    const payload = templateFormPayload();

    setButtonBusy(button, true, 'Menyimpan...');

    try {
        await invokeTemplateMutation(action, payload);
        closeTemplateModal();
        showToast(
            action === 'create'
                ? 'Template baru disimpan sebagai Draft.'
                : 'Template berhasil diperbarui.',
            'success'
        );
        await fetchTemplates();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function quickTemplateStatus(item, nextStatus, button) {
    const publishing = nextStatus === 'published';
    const confirmed = await requestConfirmation({
        title: publishing ? 'Publish Template?' : 'Unpublish Template?',
        message: publishing
            ? `Template ${item.name} akan muncul di katalog dan bisa dipesan.`
            : `Template ${item.name} akan hilang dari katalog baru. Order lama tetap aman dan link aktif tetap berjalan.`,
        confirmText: publishing ? 'Publish' : 'Unpublish',
        danger: !publishing
    });

    if (!confirmed) return;

    setButtonBusy(button, true, publishing ? 'Publishing...' : 'Menyimpan...');

    try {
        await invokeTemplateMutation(
            'update',
            fullTemplateMutationPayload(item, nextStatus)
        );
        showToast(
            publishing
                ? `${item.name} sudah Published.`
                : `${item.name} sudah Unpublished.`,
            publishing ? 'success' : 'warning'
        );
        await fetchTemplates();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function deleteTemplate(item, button) {
    const confirmed = await requestConfirmation({
        title: 'Hapus Draft Template?',
        message: `Template ${item.name} akan dihapus dari registry. Tindakan ini hanya diizinkan untuk draft yang belum source-ready dan belum pernah dipakai order.`,
        confirmText: 'Hapus Draft',
        danger: true
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Menghapus...');

    try {
        await invokeTemplateMutation('delete', { slug: item.slug });
        showToast(`${item.name} berhasil dihapus dari registry.`, 'warning');
        await fetchTemplates();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}


// =========================================================================
// 6. MEDIA & STORAGE MANAGER
// =========================================================================

function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    const digits = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

function appendStorageTableMessage(message, { isError = false } = {}) {
    const tbody = document.getElementById('storageTableBody');
    if (!tbody) return;

    clearElement(tbody);

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = message;
    cell.style.textAlign = 'center';

    if (isError) cell.style.color = 'var(--danger)';

    row.appendChild(cell);
    tbody.appendChild(row);
}

function storageStatusMeta(file) {
    const status = String(file?.status || '');

    const map = {
        used: { label: 'Dipakai', className: 'used' },
        used_legacy: { label: 'Legacy · Dipakai', className: 'used' },
        orphan: { label: 'Orphan', className: 'orphan' },
        legacy_protected: { label: 'Legacy Protected', className: 'legacy' },
        protected_unknown: { label: 'Protected', className: 'protected' },
        order_protected: { label: 'Order Protected', className: 'protected' },
        uploading: { label: 'Upload Aktif', className: 'uploading' },
        music_protected: { label: 'Musik Protected', className: 'music' }
    };

    return map[status] || { label: 'Protected', className: 'protected' };
}

function storageMatchesFilter(file) {
    const search = adminStorageState.filters.search.trim().toLowerCase();
    const filter = adminStorageState.filters.status;
    const meta = storageStatusMeta(file);

    if (filter === 'orphan' && file.status !== 'orphan') return false;
    if (
        filter === 'used' &&
        !['used', 'used_legacy', 'order_protected'].includes(file.status)
    ) return false;
    if (
        filter === 'legacy' &&
        file.kind !== 'legacy' &&
        !['protected_unknown', 'order_protected'].includes(file.status)
    ) return false;
    if (filter === 'music' && file.kind !== 'music') return false;
    if (filter === 'uploading' && file.status !== 'uploading') return false;

    if (!search) return true;

    const orderText = Array.isArray(file.orders)
        ? file.orders
            .map(order => `${order.id_kado || ''} ${order.status || ''}`)
            .join(' ')
        : '';

    const haystack = [
        file.bucket,
        file.path,
        file.name,
        file.owner_id,
        file.reason,
        meta.label,
        orderText
    ]
        .map(value => String(value || '').toLowerCase())
        .join(' ');

    return haystack.includes(search);
}

function updateStorageSummary(summary) {
    const safe = summary || {};

    const values = {
        storageTotalSize: formatBytes(safe.total_bytes),
        storagePhotoSize: formatBytes(safe.photo_bytes),
        storageMusicSize: formatBytes(safe.music_bytes),
        storageOrphanSize: formatBytes(safe.orphan_bytes),
        storageTotalFiles: `${Number(safe.total_files || 0)} file`,
        storagePhotoFiles: `${Number(safe.photo_files || 0)} file`,
        storageMusicFiles: `${Number(safe.music_files || 0)} file · protected`,
        storageOrphanFiles: `${Number(safe.orphan_files || 0)} file`
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    const scanNote = document.getElementById('storageScanNote');
    if (scanNote) {
        scanNote.textContent = safe.truncated
            ? 'Daftar dibatasi demi keamanan; sebagian file belum ditampilkan.'
            : `${Number(safe.legacy_files || 0)} file legacy dilindungi`;
    }
}

function renderStorageFiles() {
    const tbody = document.getElementById('storageTableBody');
    const resultCount = document.getElementById('storageResultCount');
    if (!tbody) return;

    const files = adminStorageState.files
        .filter(storageMatchesFilter)
        .sort((a, b) => {
            const priority = { orphan: 0, uploading: 1, used: 2, used_legacy: 2 };
            const aPriority = priority[a.status] ?? 3;
            const bPriority = priority[b.status] ?? 3;

            if (aPriority !== bPriority) return aPriority - bPriority;
            return String(a.path || '').localeCompare(String(b.path || ''));
        });

    clearElement(tbody);

    if (resultCount) {
        resultCount.textContent = `${files.length} dari ${adminStorageState.files.length} file`;
    }

    if (!files.length) {
        appendStorageTableMessage('Tidak ada file yang cocok dengan filter.');
        return;
    }

    files.forEach(file => {
        const row = document.createElement('tr');

        const bucketCell = document.createElement('td');
        bucketCell.textContent = String(file.bucket || '-');

        const pathCell = document.createElement('td');
        const path = document.createElement('div');
        path.className = 'storage-path';
        path.textContent = String(file.path || '-');

        const type = document.createElement('small');
        type.textContent = [
            cleanOptionalValue(file.mime_type),
            file.kind === 'legacy' ? 'legacy root' : cleanOptionalValue(file.owner_id)
        ]
            .filter(Boolean)
            .join(' · ');
        path.appendChild(type);
        pathCell.appendChild(path);

        const sizeCell = document.createElement('td');
        sizeCell.textContent = formatBytes(file.size);

        const statusCell = document.createElement('td');
        const meta = storageStatusMeta(file);
        const badge = document.createElement('span');
        badge.className = `storage-status ${meta.className}`;
        badge.textContent = meta.label;
        statusCell.appendChild(badge);

        const infoCell = document.createElement('td');
        const orders = Array.isArray(file.orders) ? file.orders : [];

        if (orders.length) {
            const uniqueOrders = [
                ...new Map(
                    orders.map(order => [
                        order.id_kado,
                        `${order.id_kado} · ${order.status}`
                    ])
                ).values()
            ];
            infoCell.textContent = uniqueOrders.join(', ');
        } else if (file.owner_id) {
            infoCell.textContent = String(file.owner_id);
        } else {
            infoCell.textContent = '-';
        }

        const reason = document.createElement('small');
        reason.style.display = 'block';
        reason.style.marginTop = '4px';
        reason.style.color = 'var(--text-gray)';
        reason.textContent = String(file.reason || '');
        infoCell.appendChild(reason);

        const dateCell = document.createElement('td');
        dateCell.className = 'order-date';
        dateCell.textContent = file.updated_at
            ? formatOrderDate(file.updated_at)
            : file.created_at
                ? formatOrderDate(file.created_at)
                : '-';

        const actionCell = document.createElement('td');
        actionCell.className = 'order-actions';

        if (file.deletable === true && file.status === 'orphan') {
            actionCell.appendChild(
                createActionButton(
                    'btn-del',
                    'Hapus file orphan yang sudah lolos safety check',
                    '🗑️ Hapus Orphan',
                    event => deleteOrphanStorageFile(file, event.currentTarget)
                )
            );
        } else {
            const protectedLabel = document.createElement('span');
            protectedLabel.style.color = 'var(--text-gray)';
            protectedLabel.style.fontSize = '.76rem';
            protectedLabel.textContent = '🔒 Protected';
            actionCell.appendChild(protectedLabel);
        }

        row.append(
            bucketCell,
            pathCell,
            sizeCell,
            statusCell,
            infoCell,
            dateCell,
            actionCell
        );
        tbody.appendChild(row);
    });
}

async function invokeStorageManager(action, payload = {}) {
    const { data, error } = await supabaseClient.functions.invoke(
        'admin-storage-manager',
        {
            body: { action, ...payload }
        }
    );

    if (error) {
        throw new Error(
            await readFunctionError(error, 'Storage Manager gagal dijalankan.')
        );
    }

    if (!data?.success) {
        throw new Error(data?.error || 'Storage Manager gagal dijalankan.');
    }

    return data;
}

async function fetchStorageSnapshot() {
    const refreshButton = document.getElementById('refreshStorageButton');

    appendStorageTableMessage('Memindai Supabase Storage... ⏳');
    setButtonBusy(refreshButton, true, 'Memindai...');

    try {
        const data = await invokeStorageManager('list');

        adminStorageState.files = Array.isArray(data.files) ? data.files : [];
        adminStorageState.summary = data.summary || null;

        updateStorageSummary(adminStorageState.summary);
        renderStorageFiles();
    } catch (error) {
        console.error(error);
        appendStorageTableMessage(
            `Gagal memuat Storage: ${error.message}`,
            { isError: true }
        );
        showToast('Storage Manager gagal dimuat.', 'error');
    } finally {
        setButtonBusy(refreshButton, false);
    }
}

async function deleteOrphanStorageFile(file, button) {
    const confirmed = await requestConfirmation({
        title: 'Hapus File Orphan?',
        message: `File ${file.path} akan dihapus permanen dari bucket foto_kado.\n\nBackend akan memeriksa ulang order dan grant upload sebelum penghapusan dilakukan.`,
        confirmText: 'Hapus Orphan',
        danger: true
    });

    if (!confirmed) return;

    setButtonBusy(button, true, 'Menghapus...');

    try {
        await invokeStorageManager('delete_orphan', { path: file.path });
        showToast(`File orphan ${file.path} berhasil dihapus.`, 'success');
        await fetchStorageSnapshot();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function resetStorageFilters() {
    adminStorageState.filters.search = '';
    adminStorageState.filters.status = 'all';

    const search = document.getElementById('storageSearch');
    const status = document.getElementById('storageStatusFilter');

    if (search) search.value = '';
    if (status) status.value = 'all';

    renderStorageFiles();
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
const addTemplateButton = document.getElementById('addTemplateButton');
const refreshTemplatesButton = document.getElementById('refreshTemplatesButton');
const templateForm = document.getElementById('templateForm');
const closeTemplateModalButton = document.getElementById('closeTemplateModal');
const cancelTemplateButton = document.getElementById('cancelTemplateButton');
const refreshStorageButton = document.getElementById('refreshStorageButton');
const storageSearchInput = document.getElementById('storageSearch');
const storageStatusFilter = document.getElementById('storageStatusFilter');
const storageClearFilterButton = document.getElementById('storageClearFilterButton');

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
    refreshOrdersButton.addEventListener('click', () => {
        fetchPesanan({ refreshTemplateCount: true });
    });
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

if (addTemplateButton) {
    addTemplateButton.addEventListener('click', () => openTemplateModal());
}

if (refreshTemplatesButton) {
    refreshTemplatesButton.addEventListener('click', fetchTemplates);
}

if (templateForm) {
    templateForm.addEventListener('submit', saveTemplate);
}

if (closeTemplateModalButton) {
    closeTemplateModalButton.addEventListener('click', closeTemplateModal);
}

if (cancelTemplateButton) {
    cancelTemplateButton.addEventListener('click', closeTemplateModal);
}

document.getElementById('modal-template')?.addEventListener('click', event => {
    if (event.target.id === 'modal-template') closeTemplateModal();
});

if (refreshStorageButton) {
    refreshStorageButton.addEventListener('click', fetchStorageSnapshot);
}

if (storageSearchInput) {
    storageSearchInput.addEventListener('input', event => {
        adminStorageState.filters.search = event.target.value || '';
        renderStorageFiles();
    });
}

if (storageStatusFilter) {
    storageStatusFilter.addEventListener('change', event => {
        adminStorageState.filters.status = event.target.value || 'all';
        renderStorageFiles();
    });
}

if (storageClearFilterButton) {
    storageClearFilterButton.addEventListener('click', resetStorageFilters);
}

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    closeOrderDetail();
    closeTemplateModal();
    closeConfirmation(false);
});

document.getElementById('modal-order-detail')?.addEventListener('click', event => {
    if (event.target.id === 'modal-order-detail') closeOrderDetail();
});

document.getElementById('modal-confirm-action')?.addEventListener('click', event => {
    if (event.target.id === 'modal-confirm-action') closeConfirmation(false);
});
