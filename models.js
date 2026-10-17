/* =============================================================================
 * models.js — Model data aplikasi (Object Oriented ES6+).
 *   • BaseItem     : class induk berisi id, createdAt, updatedAt.
 *   • TaskItem     : tugas/catatan kuliah + logika deadline & prioritas.
 *   • NoteItem     : catatan cepat.
 *   • ScheduleItem : jadwal kuliah mingguan.
 * Menggunakan getter, static method, destructuring, dan spread operator.
 * ========================================================================== */

/** Class induk semua item: menyimpan metadata umum. */
class BaseItem {
  constructor({ id = buatId(), createdAt = new Date().toISOString(), updatedAt = null } = {}) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** Menandai waktu modifikasi terakhir, lalu mengembalikan instance-nya. */
  sentuh() {
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /** Spread operator: memastikan properti class ikut tersimpan ke JSON. */
  toJSON() {
    return { ...this };
  }

  /** Factory method: membangun instance dari data mentah localStorage/API. */
  static fromJSON(data = {}) {
    return new this(data);
  }
}

/* ------------------------------------------------------------------ TASK --- */
class TaskItem extends BaseItem {
  constructor({
    title = '',
    course = '',
    priority = 'sedang',
    dueDate = '',
    done = false,
    source = 'manual',
    ...sisa
  } = {}) {
    super(sisa); // sisa berisi id/createdAt/updatedAt (destructuring + rest)
    this.title = title.trim();
    this.course = course.trim();
    this.priority = PRIORITAS[priority] ? priority : 'sedang';
    this.dueDate = dueDate;
    this.done = done;
    this.source = source;
  }

  /** Getter: apakah tugas ini melewati deadline? */
  get isOverdue() {
    return !this.done && Boolean(this.dueDate) && this.dueDate < hariIni();
  }

  /** Getter: metadata prioritas (label + bobot) untuk kebutuhan UI/sorting. */
  get priorityMeta() {
    return PRIORITAS[this.priority] ?? PRIORITAS.sedang;
  }

  /** Getter: label deadline ramah pengguna. */
  get deadlineLabel() {
    return labelDeadline(this.dueDate);
  }

  /** Membalik status selesai/belum selesai. */
  toggle() {
    this.done = !this.done;
    return this.sentuh();
  }

  /** Memperbarui sebagian properti (partial update) secara aman. */
  update(patch = {}) {
    const { id: _id, createdAt: _createdAt, ...aman } = patch;
    Object.assign(this, aman);
    return this.sentuh();
  }

  /** Comparator untuk fitur pengurutan daftar tugas. */
  static comparator(sort = 'due') {
    const daftar = {
      due: (a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'),
      priority: (a, b) => b.priorityMeta.bobot - a.priorityMeta.bobot,
      created: (a, b) => b.createdAt.localeCompare(a.createdAt),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    const aturan = daftar[sort] ?? daftar.due;
    return (a, b) => aturan(a, b) || a.title.localeCompare(b.title);
  }
}

/* ------------------------------------------------------------------ NOTE --- */
class NoteItem extends BaseItem {
  constructor({ title = '', body = '', ...sisa } = {}) {
    super(sisa);
    this.title = title.trim();
    this.body = body.trim();
  }

  /** Ringkasan isi catatan untuk ditampilkan di kartu. */
  get ringkasan() {
    const teks = this.body.replace(/\s+/g, ' ').trim();
    if (!teks) return 'Tidak ada isi catatan.';
    return teks.length > 140 ? `${teks.slice(0, 140)}…` : teks;
  }

  update(patch = {}) {
    const { id: _id, createdAt: _createdAt, ...aman } = patch;
    Object.assign(this, aman);
    return this.sentuh();
  }
}

/* -------------------------------------------------------------- SCHEDULE --- */
class ScheduleItem extends BaseItem {
  constructor({
    course = '',
    day = 'Senin',
    start = '08:00',
    end = '10:00',
    room = '',
    lecturer = '',
    ...sisa
  } = {}) {
    super(sisa);
    this.course = course.trim();
    this.day = HARI_KULIAH.includes(day) ? day : 'Senin';
    this.start = start;
    this.end = end;
    this.room = room.trim();
    this.lecturer = lecturer.trim();
  }

  /** Getter: rentang waktu kuliah, contoh "08:00 – 10:00". */
  get timeRange() {
    return `${this.start} – ${this.end}`;
  }

  /** Getter: durasi mata kuliah dalam satuan menit. */
  get durasiMenit() {
    const [jamAwal, menitAwal] = this.start.split(':').map(Number);
    const [jamAkhir, menitAkhir] = this.end.split(':').map(Number);
    return Math.max(0, jamAkhir * 60 + menitAkhir - (jamAwal * 60 + menitAwal));
  }

  /** Getter: apakah jadwal ini berlangsung hari ini? */
  get isToday() {
    return NAMA_HARI[new Date().getDay()] === this.day;
  }

  update(patch = {}) {
    const { id: _id, createdAt: _createdAt, ...aman } = patch;
    Object.assign(this, aman);
    return this.sentuh();
  }

  /** Comparator: urutkan berdasarkan urutan hari lalu jam mulai. */
  static comparator(a, b) {
    return HARI_KULIAH.indexOf(a.day) - HARI_KULIAH.indexOf(b.day) || a.start.localeCompare(b.start);
  }
}
