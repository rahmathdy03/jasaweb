document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const templateCards = document.querySelectorAll('.template-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. Hapus class 'active' dari semua tombol
      tabBtns.forEach(t => t.classList.remove('active'));
      
      // 2. Tambahkan class 'active' ke tombol yang diklik
      btn.classList.add('active');

      // 3. Ambil data kategori dari tombol yang diklik
      const filterValue = btn.getAttribute('data-filter');

      // 4. Sembunyikan atau tampilkan kartu berdasarkan kategori
      templateCards.forEach(card => {
        if (filterValue === 'all') {
          // Jika pilih 'Semua', tampilkan semua kartu
          card.style.display = 'block';
        } else {
          // Jika kartu memiliki class yang sama dengan nama filter, tampilkan
          if (card.classList.contains(filterValue)) {
            card.style.display = 'block';
          } else {
            // Sembunyikan yang tidak cocok
            card.style.display = 'none';
          }
        }
      });
    });
  });
});