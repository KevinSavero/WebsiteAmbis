/* =============================================================================
 * utils.js — Fungsi bantu (helper) yang dipakai seluruh modul.
 * Fokus ES6+: arrow function, template literal, destructuring, spread, default
 * parameter, dan optional chaining.
 * ========================================================================== */

/** Daftar hari dalam Bahasa Indonesia, index 0 = Minggu (sesuai Date.getDay()). */
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Daftar hari untuk dropdown form jadwal (Senin s.d. Sabtu). */
const HARI_KULIAH = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Metadata prioritas tugas: label, warna, dan bobot untuk pengurutan. */
const PRIORITAS = {
  tinggi: { label: 'Tinggi', bobot: 3 },
  sedang: { label: 'Sedang', bobot: 2 },
  rendah: { label: 'Rendah', bobot: 1 },
};

/** ID unik dengan fallback bila crypto.randomUUID() tidak tersedia. */
const buatId = () =>
  crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Mengubah teks menjadi format YYYY-MM-DD sesuai zona waktu lokal. */
const keTanggalLokal = (date = new Date()) => {
  const { year, month, day } = {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
  return `${year}-${month}-${day}`;
};

/** Tanggal hari ini dalam format YYYY-MM-DD. */
const hariIni = () => keTanggalLokal(new Date());

/** Escape karakter HTML agar data pengguna aman ditampilkan lewat template literal. */
const amanHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

/** Format tanggal Indonesia, contoh: "Senin, 12 Mei 2025". */
const formatTanggal = (isoDate) => {
  if (!isoDate) return 'Tanpa deadline';
  const tanggal = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) return 'Tanggal tidak valid';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(tanggal);
};

/** Format jam:menit dari Date, contoh: "14:35" (format 24 jam). */
const formatJam = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** Selisih hari antara dua tanggal (YYYY-MM-DD) dalam satuan hari. */
const selisihHari = (isoDate, pembanding = hariIni()) => {
  const target = new Date(`${isoDate}T00:00:00`);
  const dasar = new Date(`${pembanding}T00:00:00`);
  return Math.round((target - dasar) / 86_400_000);
};

/** Label ramah untuk deadline, contoh: "Hari ini", "Besok", "Terlambat 2 hari". */
const labelDeadline = (isoDate) => {
  if (!isoDate) return '';
  const selisih = selisihHari(isoDate);
  if (selisih === 0) return 'Hari ini';
  if (selisih === 1) return 'Besok';
  if (selisih === -1) return 'Terlambat 1 hari';
  if (selisih < 0) return `Terlambat ${Math.abs(selisih)} hari`;
  if (selisih <= 7) return `${selisih} hari lagi`;
  return `${Math.ceil(selisih / 7)} minggu lagi`;
};

/** Sapaan berdasarkan jam sekarang: pagi/siang/sore/malam. */
const sapaanWaktu = (date = new Date()) => {
  const jam = date.getHours();
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
};

/** Debounce: menunda eksekusi fungsi (dipakai untuk kolom pencarian). */
const debounce = (fn, delay = 250) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/** Mengubah Blob menjadi teks lewat FileReader yang dibungkus Promise. */
const bacaFileSebagaiTeks = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ({ target }) => resolve(target.result);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });

/** Membungkus promise dengan batas waktu agar aplikasi tidak "menggantung". */
const denganBatasWaktu = (promise, ms = 9000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(`Permintaan melebihi ${ms / 1000} detik.`));
      }, ms);
    }),
  ]);

/** Senin pekan ke-1 semester ini — dasar perhitungan nomor pekan akademik. */
const AWAL_PEKAN_SEMESTER = '2026-08-31';

/**
 * Nomor pekan akademik untuk sebuah tanggal (contoh keluaran: 7 → "pekan ke-7").
 * Dihitung dari selisih hari terhadap Senin pekan ke-1, bukan dari tanggal 1 bulan,
 * sehingga satu pekan kuliah selalu bernomor sama dari Senin sampai Minggu.
 */
const pekanAkademik = (tanggal = hariIni()) => {
  const selisih = selisihHari(tanggal, AWAL_PEKAN_SEMESTER);
  return selisih < 0 ? 1 : Math.floor(selisih / 7) + 1;
};

/**
 * Label zona waktu yang enak dibaca, bukan nama regional (mis. "Asia/Jakarta").
 * WIB = UTC+7, WITA = UTC+8, WIT = UTC+9; offset lain ditulis apa adanya, mis. "UTC+05:30".
 */
const labelZonaWaktu = (date = new Date()) => {
  const menit = -date.getTimezoneOffset();
  const nama = { 420: 'WIB', 480: 'WITA', 540: 'WIT' }[menit];
  if (nama) return nama;
  const tanda = menit < 0 ? '-' : '+';
  const jam = String(Math.floor(Math.abs(menit) / 60)).padStart(2, '0');
  const sisaMenit = Math.abs(menit) % 60;
  return `UTC${tanda}${jam}${sisaMenit ? `:${String(sisaMenit).padStart(2, '0')}` : ''}`;
};
