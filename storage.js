/* =============================================================================
 * storage.js — Pengelolaan data (localStorage).
 * Semua akses localStorage dibungkus try/catch supaya aplikasi tetap berjalan
 * bila storage penuh, diblokir, atau berisi JSON yang rusak.
 * ========================================================================== */

class StorageService {
  constructor({ namespace = 'web-menuju-ambis' } = {}) {
    this.namespace = namespace;
  }

  /** Membentuk nama key lengkap, contoh: "web-menuju-ambis:tasks". */
  kunci(nama) {
    return `${this.namespace}:${nama}`;
  }

  /** Mengambil data dan otomatis mengubah JSON menjadi object (fallback aman). */
  load(nama, fallback = null) {
    try {
      const mentah = localStorage.getItem(this.kunci(nama));
      return mentah === null ? fallback : JSON.parse(mentah);
    } catch (error) {
      console.error(`[StorageService] Gagal membaca "${nama}":`, error);
      return fallback;
    }
  }

  /** Menyimpan object menjadi JSON. Mengembalikan status keberhasilan. */
  save(nama, nilai) {
    try {
      localStorage.setItem(this.kunci(nama), JSON.stringify(nilai));
      return true;
    } catch (error) {
      console.error(`[StorageService] Gagal menyimpan "${nama}":`, error);
      return false;
    }
  }

  remove(nama) {
    localStorage.removeItem(this.kunci(nama));
  }

  /** Mengubah array data mentah menjadi array instance class (TaskItem, dll). */
  loadCollection(nama, Model) {
    const mentah = this.load(nama, []);
    return Array.isArray(mentah) ? mentah.map((item) => Model.fromJSON(item)) : [];
  }

  /** Menyimpan array instance class ke localStorage. */
  saveCollection(nama, koleksi = []) {
    return this.save(nama, koleksi.map((item) => item.toJSON()));
  }

  /** Menghapus semua data milik namespace aplikasi ini. */
  reset() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${this.namespace}:`))
      .forEach((key) => localStorage.removeItem(key));
  }

  /** Migrasi: membuang sisa data dari nama/namespace versi sebelumnya. */
  bersihkanDataLama(namaLama = 'itera-dashboard') {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${namaLama}:`))
      .forEach((key) => localStorage.removeItem(key));
  }
}
