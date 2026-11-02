# KadoDigital / jasaweb

Website statis berbasis HTML, CSS, JavaScript, Supabase, dan Vercel untuk membuat kado digital dari beberapa template.

## Arsitektur singkat

```text
index.html
├── katalog template
└── router link pendek /?id=...

order.html
└── assets/js/order.js
    ├── upload foto ke Supabase Storage
    └── insert pesanan berstatus pending

admin.html
└── assets/js/admin.js
    └── login Supabase Auth + kelola pesanan

templates/pasangan/
├── semester-celebration/
├── deeptalk-template/
├── birthday-cinema/
└── our-story-anniversary/
```

Konfigurasi browser Supabase terpusat di:

```text
assets/js/supabase.js
```

Anon key memang dimuat di browser. Keamanan data bergantung pada RLS, policy, dan RPC yang sudah dibatasi di Supabase.

## Slug template resmi

| Template | Slug |
| --- | --- |
| Semester Celebration | `semester-celebration` |
| DeepTalk Night | `deeptalk-template` |
| Birthday Cinema | `birthday-cinema` |
| Our Story Anniversary | `our-story-anniversary` |

Jangan membuat nama alias baru di database. Nilai kolom `pesanan.template` harus sama dengan nama folder template.

## Status keamanan

- [x] RLS tabel `pesanan`
- [x] Role admin untuk dashboard
- [x] Render dashboard aman dari stored XSS
- [x] Slug template distandarkan
- [x] Password Semester Celebration disimpan sebagai bcrypt hash
- [x] Konten Semester Celebration dilindungi token sesi
- [x] Our Story Anniversary: memory quiz, counter, timeline, gallery, reasons, music, love letter, coupon, dan final surprise

## Alur deployment

```text
GitHub main
    ↓
Vercel production
    ↓
jasaweb-iota.vercel.app
    ↓
Supabase
```

Perubahan sebaiknya dibuat di branch, dites lewat Vercel Preview, lalu di-merge ke `main`.

## Catatan pengembangan

- Jangan membuat file seperti `app_final.js`, `app_updated.js`, atau versi duplikat lainnya. Gunakan Git untuk version history.
- Jangan menaruh service-role key Supabase di frontend.
- Jangan mematikan RLS untuk membuat fitur bekerja.
- Saat menambah template baru, samakan slug katalog, query `order.html?template=...`, nilai database, dan nama folder template.


## Our Story Anniversary

Preview demo menggunakan `id=demo-ourstory`.

Alur template:

```text
Memory Quiz (3 foto blur)
        ↓
Hero Anniversary
        ↓
Relationship Counter
        ↓
Story Timeline
        ↓
3D Memory Gallery
        ↓
Why I Love You
        ↓
Our Song
        ↓
Love Letter
        ↓
Love Coupon
        ↓
Final Surprise
```

Form order Our Story membutuhkan minimal 3 dan maksimal 6 foto. Tiga foto pertama dipakai untuk Memory Quiz dan `caption_1` sampai `caption_3` menjadi jawaban yang benar.


## Birthday Cinema

Status: hardened dan siap dipakai.

- Data customer tidak lagi dirender dengan `innerHTML`.
- Tidak ada fallback data palsu ketika kado gagal dimuat.
- Timeline, surat, alasan sayang, dan kupon memakai DOM API + `textContent`.
- Asset hadiah menggunakan file lokal `assets/img/kado.png`.
- Inline `onclick` / `onerror` di halaman utama sudah dihapus.
- Upload Birthday Cinema dibatasi maksimal 4 foto.
- DeepTalk Night divalidasi tepat 2 foto sesuai desain template.


## DeepTalk Night

Status: hardened dan siap dipakai.

- Data pasangan dimuat dari RPC Supabase tanpa fallback palsu.
- Error state untuk link salah / template salah dibuat eksplisit.
- Tombol audio memakai `link_musik` dari Supabase dan sekarang benar-benar berfungsi.
- Inline `onclick` dihapus dan diganti `addEventListener`.
- Kartu pertanyaan bisa dibuka dengan mouse/touch maupun keyboard.
- Transition screen antar bab sekarang benar-benar ada.
- Tanggal jadian ditampilkan dalam format Indonesia.
- Typewriter tidak memakai `innerHTML`.
- Kamera memakai `getUserMedia` dengan error handling.
- Wishlist pada hasil foto dibungkus ke beberapa baris agar tidak mudah terpotong.
- Form order mewajibkan tepat 2 foto untuk DeepTalk Night.
