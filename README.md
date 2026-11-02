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
- [ ] Audit dan penyelesaian penuh Our Story Anniversary

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
