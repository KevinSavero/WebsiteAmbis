/* =============================================================================
 * api.js — Semua komunikasi ke API publik (operasi asinkron).
 * Sumber data (gratis, tanpa API key):
 *   1. Open-Meteo  → cuaca real-time lokasi Lampung  (async/await)
 *   2. DummyJSON   → kutipan motivasi harian       (Promise chaining)
 * ========================================================================== */

/** Pemetaan kode cuaca WMO (standar Open-Meteo) ke label & ikon Bahasa Indonesia. */
const KODE_CUACA = {
  0: { label: 'Cerah', icon: '☀️' },
  1: { label: 'Cerah berawan', icon: '🌤️' },
  2: { label: 'Berawan sebagian', icon: '⛅' },
  3: { label: 'Mendung', icon: '☁️' },
  45: { label: 'Berkabut', icon: '🌫️' },
  48: { label: 'Kabut beku', icon: '🌫️' },
  51: { label: 'Gerimis ringan', icon: '🌦️' },
  53: { label: 'Gerimis sedang', icon: '🌦️' },
  55: { label: 'Gerimis lebat', icon: '🌧️' },
  56: { label: 'Gerimis beku ringan', icon: '🌧️' },
  57: { label: 'Gerimis beku lebat', icon: '🌧️' },
  61: { label: 'Hujan ringan', icon: '🌦️' },
  63: { label: 'Hujan sedang', icon: '🌧️' },
  65: { label: 'Hujan lebat', icon: '⛈️' },
  66: { label: 'Hujan beku ringan', icon: '🌧️' },
  67: { label: 'Hujan beku lebat', icon: '⛈️' },
  71: { label: 'Salju ringan', icon: '🌨️' },
  73: { label: 'Salju sedang', icon: '🌨️' },
  75: { label: 'Salju lebat', icon: '❄️' },
  77: { label: 'Butiran salju', icon: '❄️' },
  80: { label: 'Hujan lokal ringan', icon: '🌦️' },
  81: { label: 'Hujan lokal sedang', icon: '🌧️' },
  82: { label: 'Hujan lokal lebat', icon: '⛈️' },
  85: { label: 'Hujan salju ringan', icon: '🌨️' },
  86: { label: 'Hujan salju lebat', icon: '❄️' },
  95: { label: 'Badai petir', icon: '⛈️' },
  96: { label: 'Badai petir + hujan es', icon: '⛈️' },
  99: { label: 'Badai petir hebat', icon: '🌩️' },
};

class ApiService {
  constructor({
    timeout = 9000,
    cuaca = { latitude: -5.3583, longitude: 105.3146, lokasi: 'Lampung, Indonesia' },
    cacheTTL = 10 * 60 * 1000,
  } = {}) {
    this.timeout = timeout;
    this.cuaca = cuaca;
    this.cacheTTL = cacheTTL;
    this.kunciCache = 'web-menuju-ambis:cuaca-cache';
    this.urlCuaca = 'https://api.open-meteo.com/v1/forecast';
    this.urlKutipan = 'https://dummyjson.com/quotes/random';
  }

  /** Menerjemahkan kode WMO menjadi { label, icon }. */
  static deskripsiCuaca(kode) {
    return KODE_CUACA[kode] ?? { label: 'Kondisi tidak diketahui', icon: '🌡️' };
  }

  /** Mengambil cuaca terkini untuk lokasi yang dikonfigurasi (async/await + AbortController). */
  async ambilCuaca({ latitude, longitude } = {}) {
    const { lokasi } = this.cuaca;
    const koordinat = {
      latitude: latitude ?? this.cuaca.latitude,
      longitude: longitude ?? this.cuaca.longitude,
    };
    const url = `${this.urlCuaca}?latitude=${koordinat.latitude}&longitude=${koordinat.longitude}&current_weather=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Open-Meteo membalas HTTP ${response.status}`);
      }

      // Destructuring objek hasil API + aliasing nama field "snake_case".
      const { current_weather: current } = await response.json();
      const { temperature, windspeed, winddirection, weathercode, time } = current;
      const { label, icon } = ApiService.deskripsiCuaca(weathercode);

      const data = {
        suhu: Math.round(temperature),
        kecepatanAngin: Math.round(windspeed),
        arahAngin: winddirection,
        kodeCuaca: weathercode,
        label,
        icon,
        lokasi,
        waktu: time,
        diambilPada: new Date().toISOString(),
        sumber: 'jaringan',
      };

      this.simpanCacheCuaca(data);
      return data;
    } catch (error) {
      console.warn('[ApiService] Cuaca gagal diambil:', error.message);
      const cache = this.ambilCacheCuaca();
      if (cache) return { ...cache, sumber: 'cache', catatan: error.message };
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Kutipan acak DummyJSON — versi Promise chaining (.then/.catch). */
  ambilKutipan() {
    return denganBatasWaktu(fetch(this.urlKutipan), this.timeout)
      .then((response) => {
        if (!response.ok) throw new Error(`DummyJSON membalas HTTP ${response.status}`);
        return response.json();
      })
      .then(({ quote, author }) => ({ kutipan: quote, penulis: author, sumber: 'jaringan' }))
      .catch((error) => {
        console.warn('[ApiService] Kutipan gagal diambil:', error.message);
        return {
          kutipan: 'Belajar bukan tentang menjadi paling pintar, tapi tentang tidak berhenti mencoba.',
          penulis: 'Pesan lokal',
          sumber: 'lokal',
        };
      });
  }

  /** Menyimpan hasil cuaca terakhir sebagai cache agar bisa dipakai offline. */
  simpanCacheCuaca(data) {
    try {
      localStorage.setItem(this.kunciCache, JSON.stringify(data));
    } catch (error) {
      console.warn('[ApiService] Cache cuaca tidak tersimpan:', error.message);
    }
  }

  /** Membaca cache cuaca bila umurnya belum melewati cacheTTL. */
  ambilCacheCuaca() {
    try {
      const mentah = localStorage.getItem(this.kunciCache);
      if (!mentah) return null;
      const data = JSON.parse(mentah);
      const umur = Date.now() - new Date(data.diambilPada).getTime();
      return umur < this.cacheTTL ? data : null;
    } catch {
      return null;
    }
  }
}
