# Spec Halaman: Dashboard & Sub-Pages — Travel Assistant (Telkomsel THE v2.0)

> **PRINSIP UTAMA:** Spesifikasi ini mengatur tata letak visual dan token warna Telkomsel THE v2.0 untuk seluruh 4 layar utama (*Valas*, *Scanner*, *Ngobrol*, *Spot Kalcer*) serta sub-layar (*Kamus Frasa Cepat*, *Riwayat Scan*, *Ulasan Spot*) di `src/App.jsx`.
> **KONTRAK DOM:** Jangan mengubah struktur hierarki DOM React, state hooks, atau event handler yang ada. Hanya perbarui visual skin, Tailwind classes, dan token warna dual-theme.

---

## 1. Ringkasan Token Design System (THE v2.0)

| Token Nama | Color Hex / Tailwind Class | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| **Telkomsel Red** | `#FF0025` / `from-[#FF0025]` | Utama (Aksen, tombol aktif, badge utama) |
| **Portal Orange** | `#FDA22B` / `to-[#FDA22B]` | Gradien sekunder (Logo icon, CTA gradient, chip aktif) |
| **Deep Navy** | `#001A41` / `dark:bg-[#001A41]` | Background mode gelap & teks utama mode terang |
| **Card Surface Dark** | `#0A1937` / `dark:bg-[#0A1937]/80` | Kartu permukaan mode gelap |
| **Light BG** | `#F4F6FB` / `bg-[#F4F6FB]` | Background mode terang |
| **Border Tokens** | `border-slate-200/80` / `dark:border-white/10` | Garis tepi subtil seragam |

---

## 2. Spesifikasi Layar & Sub-Pages (Berdasarkan 4 Screenshots Real App)

### 💬 Layar 1: Ngobrol (Terjemahan AI Chat & Voice)
- **Header Badge:** `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20` (`VOICE`).
- **Language Switcher Bar:** `bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10` dengan teks aksen `text-red-600 dark:text-red-400`.
- **Textarea Input:** `bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10` dengan focus ring merah (`focus:border-[#FF0025] focus:ring-2 focus:ring-red-500/20`).
- **Mic Button (Recording State):** `bg-red-500 text-white animate-pulse ring-2 ring-red-300`.
- **Bubble Terjemahan AI:** 
  - User bubble: `bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] text-white`.
  - AI Response bubble: `bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10` dengan badge suara `bg-red-500/10 text-red-600`.

### 📖 Sub-Layar 2: Kamus Frasa Cepat (Sub-tab Ngobrol)
- **Sub-Tab Switcher (Chat AI vs Frasa Cepat):** `p-1 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl`.
  - Active Tab: `bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 font-bold shadow-2xs`.
- **Chips Kategori Frasa (Dasar, Belanja, Makan, Kereta, Darurat):**
  - Active Chip: `bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white font-bold`.
  - Inactive Chip: `bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-white`.
- **Kartu Frasa:** Teks romaji merah (`text-red-600 dark:text-red-400`), tombol `🔊 Audio` dan `📋 Salin`.

### 📷 Layar 3: Cek Harga AI Scanner (Kamera Ready & Riwayat Result)
- **Viewfinder Reticle Frame:** `border-2 border-dashed border-red-500/40 rounded-2xl bg-white dark:bg-[#0A1937]/80`.
- **Kartu Riwayat Scan (Product Result Card):**
  - Thumbnail gambar produk dengan border subtil.
  - Tombol Salin Nama Produk (`copy` icon) di samping judul produk.
  - Harga Asal vs Estimasi IDR (`text-emerald-600 dark:text-emerald-400 font-extrabold`).
  - Badge Negara (`🇯🇵 Tokyo, JP`) & Link Komparasi Tokopedia (`text-red-600 dark:text-red-400 font-bold`).

### 📍 Layar 4: Spot Kalcer (Rekomendasi Tempat & Ulasan Komunitas)
- **GPS Status Badge:** `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`.
- **Chips Kategori (Semua, Kuliner, Kafe, Budaya):** Menggunakan chip gradien Telkomsel THE v2.0.
- **Kartu Tempat & Top 3 Ulasan:**
  - Status Buka: `bg-emerald-500/10 text-emerald-600 border border-emerald-500/20` (`🟢 Buka`).
  - Rating Badge: `bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20` (`4.9 ★`).
  - **Kotak Top 3 Ulasan:** `bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5` berisi komentar pengunjung (misal: Rian K., Dini P.).
  - **Tombol Rute Maps:** `bg-slate-100/70 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:bg-slate-200`.

---

## 3. Berkas Referensi & Artifacts
1. **Interactive HTML Canvas Dashboard:** `public/dashboard-preview.html`
2. **Interactive HTML Canvas Kartu Scanner:** `public/preview-scan-history-card.html`
3. **Interactive HTML Canvas Login:** `public/login-preview.html`
4. **Master Spec Design System:** `design-system/travel-assistant/MASTER.md`
