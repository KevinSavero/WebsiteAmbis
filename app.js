/* =============================================================================
 * app.js — DashboardApp: otak aplikasi.
 * Mengatur state, CRUD (tambah/edit/hapus), localStorage, fetch API eksternal,
 * dan seluruh proses render (template literal).
 * ========================================================================== */

class DashboardApp {
  constructor({ storage = new StorageService(), api = new ApiService() } = {}) {
    this.storage = storage;
    this.api = api;
    this.state = {
      tasks: [],
      notes: [],
      schedule: [],
      profile: { name: 'Angken Cantik' },
      settings: { theme: 'dark' },
    };
    this.filter = { query: '', status: 'all', sort: 'due' };
    this.editing = { task: null, schedule: null, note: null };
    this.dom = {};
  }

  /* ==========================================================================
   * 1. INISIALISASI
   * ======================================================================= */
  async init() {
    this.cacheDom();
    this.muatState();
    this.terapkanTema();
    this.isiPilihanHari();
    this.bindEvents();
    this.renderSemua();
    this.jalankanJam();
    await this.muatDataEksternal();
    this.toast('Dashboard siap dipakai! Semua perubahan tersimpan otomatis 💾', 'success');
  }

  /** Mengambil semua elemen penting sekali saja (destructuring objek). */
  cacheDom() {
    const id = (nama) => document.getElementById(nama);
    this.dom = {
      // Header & hero
      greeting: id('greeting'),
      todayLabel: id('today-label'),
      clock: id('clock'),
      clockZone: id('clock-zone'),
      userName: id('user-name'),
      nameBtn: id('btn-name'),
      themeBtn: id('btn-theme'),
      exportBtn: id('btn-export'),
      importBtn: id('btn-import'),
      importInput: id('import-input'),
      resetBtn: id('btn-reset'),
      // Kutipan & cuaca
      quoteText: id('quote-text'),
      quoteAuthor: id('quote-author'),
      quoteBtn: id('btn-quote'),
      weatherIcon: id('weather-icon'),
      weatherTemp: id('weather-temp'),
      weatherDesc: id('weather-desc'),
      weatherWind: id('weather-wind'),
      weatherUpdated: id('weather-updated'),
      weatherPlace: id('weather-place'),
      weatherBtn: id('btn-weather'),
      // Statistik
      statTotal: id('stat-total'),
      statPending: id('stat-pending'),
      statDone: id('stat-done'),
      statOverdue: id('stat-overdue'),
      statsHint: id('stats-hint'),
      progressBar: id('progress-bar'),
      progressText: id('progress-text'),
      // Tugas
      taskList: id('task-list'),
      taskEmpty: id('task-empty'),
      taskCount: id('task-count'),
      taskSearch: id('task-search'),
      taskStatus: id('task-status'),
      taskSort: id('task-sort'),
      addTaskBtn: id('btn-add-task'),
      taskDialog: id('task-dialog'),
      taskForm: id('task-form'),
      taskDialogTitle: id('task-dialog-title'),
      taskTitle: id('task-title'),
      taskCourse: id('task-course'),
      taskPriority: id('task-priority'),
      taskDue: id('task-due'),
      // Jadwal
      scheduleList: id('schedule-list'),
      scheduleEmpty: id('schedule-empty'),
      addScheduleBtn: id('btn-add-schedule'),
      scheduleDialog: id('schedule-dialog'),
      scheduleForm: id('schedule-form'),
      scheduleDialogTitle: id('schedule-dialog-title'),
      scheduleCourse: id('schedule-course'),
      scheduleDay: id('schedule-day'),
      scheduleStart: id('schedule-start'),
      scheduleEnd: id('schedule-end'),
      scheduleRoom: id('schedule-room'),
      scheduleLecturer: id('schedule-lecturer'),
      // Catatan
      noteList: id('note-list'),
      noteEmpty: id('note-empty'),
      addNoteBtn: id('btn-add-note'),
      noteDialog: id('note-dialog'),
      noteForm: id('note-form'),
      noteDialogTitle: id('note-dialog-title'),
      noteTitle: id('note-title'),
      noteBody: id('note-body'),
      // Lain-lain
      toastStack: id('toast-stack'),
    };
  }

  /** Memuat data dari localStorage; mengisi contoh data saat pertama kali dibuka. */
  muatState() {
    const { storage } = this;
    const tugas = storage.loadCollection('tasks', TaskItem);
    const catatan = storage.loadCollection('notes', NoteItem);
    const jadwal = storage.loadCollection('schedule', ScheduleItem);
    const profil = storage.load('profile', { name: 'Angken Cantik' });
    const pengaturan = storage.load('settings', { theme: 'dark' });
    const sudahPernahDibuka = storage.load('sudah-dibuka', false);

    this.state = {
      tasks: tugas,
      notes: catatan,
      schedule: jadwal,
      profile: profil,
      settings: pengaturan,
    };

    if (!sudahPernahDibuka) {
      this.state.tasks = [...this.contohTugas(), ...this.state.tasks];
      this.state.notes = [...this.contohCatatan(), ...this.state.notes];
      this.state.schedule = [...this.contohJadwal(), ...this.state.schedule];
      storage.save('sudah-dibuka', true);
      this.simpanState();
    }
  }

  /** Menyimpan seluruh state ke localStorage. */
  simpanState() {
    const { storage, state } = this;
    storage.saveCollection('tasks', state.tasks);
    storage.saveCollection('notes', state.notes);
    storage.saveCollection('schedule', state.schedule);
    storage.save('profile', state.profile);
    storage.save('settings', state.settings);
  }

  /* ==========================================================================
   * 2. DATA CONTOH (seed pertama kali)
   * ======================================================================= */
  contohTugas() {
    return [
      TaskItem.fromJSON({ title: 'Laporan Praktikum Jaringan Komputer 4', course: 'Jaringan Komputer', priority: 'tinggi', dueDate: '2026-10-17' }),
      TaskItem.fromJSON({ title: 'Laporan Praktikum Jaringan Komputer 5', course: 'Jaringan Komputer', priority: 'tinggi', dueDate: '2026-10-17' }),
      TaskItem.fromJSON({ title: 'Ujian Tengah Semester (19–24 Oktober 2026)', course: 'Semua Mata Kuliah', priority: 'tinggi', dueDate: '2026-10-19' }),
    ];
  }

  contohCatatan() {
    return [
      NoteItem.fromJSON({ title: 'Rumus subnetting cepat', body: 'Jumlah host = 2^n - 2, dengan n = 32 - prefix.\nContoh /26 → 2^6 - 2 = 62 host per subnet.' }),
      NoteItem.fromJSON({ title: 'Checklist sebelum presentasi', body: 'Slide rapi, latihan 5 menit, siapkan demo, backup file di flashdisk.' }),
    ];
  }

  contohJadwal() {
    return [
      ScheduleItem.fromJSON({ course: 'Kapita Selekta', day: 'Senin', start: '09:20', end: '12:00', room: 'GK2-126' }),
      ScheduleItem.fromJSON({ course: 'Sistem Informasi Kesehatan', day: 'Senin', start: '13:55', end: '16:35', room: 'GK2-125' }),
      ScheduleItem.fromJSON({ course: 'Pengembangan Aplikasi Web', day: 'Selasa', start: '07:30', end: '10:10', room: 'GK2-405' }),
      ScheduleItem.fromJSON({ course: 'Inteligensi Buatan', day: 'Selasa', start: '13:00', end: '15:40', room: 'GK2-107' }),
      ScheduleItem.fromJSON({ course: 'Praktikum Jarkom', day: 'Rabu', start: '08:00', end: '10:00', room: 'Lab IoT' }),
      ScheduleItem.fromJSON({ course: 'Metodologi Penelitian', day: 'Kamis', start: '09:20', end: '12:00', room: 'GK2-222' }),
      ScheduleItem.fromJSON({ course: 'Sistem Informasi', day: 'Jumat', start: '07:30', end: '09:15', room: 'GK2-222' }),
      ScheduleItem.fromJSON({ course: 'Manajemen Proyek Teknologi Informasi', day: 'Jumat', start: '09:20', end: '11:05', room: 'Online' }),
      ScheduleItem.fromJSON({ course: 'Jaringan Komputer', day: 'Jumat', start: '14:00', end: '15:40', room: 'GK2-302' }),
    ];
  }

  /* ==========================================================================
   * 3. EVENT BINDING
   * ======================================================================= */
  bindEvents() {
    const {
      addTaskBtn, addScheduleBtn, addNoteBtn, themeBtn, quoteBtn, weatherBtn,
      exportBtn, importBtn, importInput, resetBtn, nameBtn,
      taskList, taskSearch, taskStatus, taskSort,
      scheduleList, noteList, taskForm, scheduleForm, noteForm,
    } = this.dom;

    // Header
    themeBtn.addEventListener('click', () => this.toggleTema());
    exportBtn.addEventListener('click', () => this.eksporData());
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (event) => this.imporData(event.target.files[0]));
    resetBtn.addEventListener('click', () => this.resetData());
    nameBtn.addEventListener('click', () => this.ubahNama());

    // Widget async
    quoteBtn.addEventListener('click', () => this.muatKutipan());
    weatherBtn.addEventListener('click', () => this.muatCuaca());

    // Tugas
    addTaskBtn.addEventListener('click', () => this.bukaFormTugas());
    taskList.addEventListener('click', (event) => this.tanganiKlikTugas(event));
    taskList.addEventListener('change', (event) => this.tanganiToggleTugas(event));
    taskSearch.addEventListener('input', debounce((event) => {
      this.filter = { ...this.filter, query: event.target.value };
      this.renderTugas();
    }, 200));
    taskStatus.addEventListener('change', ({ target }) => {
      this.filter = { ...this.filter, status: target.value };
      this.renderTugas();
    });
    taskSort.addEventListener('change', ({ target }) => {
      this.filter = { ...this.filter, sort: target.value };
      this.renderTugas();
    });
    taskForm.addEventListener('submit', (event) => this.simpanFormTugas(event));

    // Jadwal
    addScheduleBtn.addEventListener('click', () => this.bukaFormJadwal());
    scheduleList.addEventListener('click', (event) => this.tanganiKlikJadwal(event));
    scheduleForm.addEventListener('submit', (event) => this.simpanFormJadwal(event));

    // Catatan
    addNoteBtn.addEventListener('click', () => this.bukaFormCatatan());
    noteList.addEventListener('click', (event) => this.tanganiKlikCatatan(event));
    noteForm.addEventListener('submit', (event) => this.simpanFormCatatan(event));

    // Tombol tutup di semua modal
    document.querySelectorAll('[data-close]').forEach((tombol) => {
      tombol.addEventListener('click', () => tombol.closest('dialog')?.close());
    });
  }

  /** Mengisi dropdown hari pada form jadwal. */
  isiPilihanHari() {
    this.dom.scheduleDay.innerHTML = HARI_KULIAH.map((hari) => `<option value="${hari}">${hari}</option>`).join('');
  }

  /* ==========================================================================
   * 4. RENDER (template literal + map/join)
   * ======================================================================= */
  renderSemua() {
    this.renderProfil();
    this.renderTanggal();
    this.renderTugas();
    this.renderStatistik();
    this.renderJadwal();
    this.renderCatatan();
  }

  renderProfil() {
    this.dom.userName.textContent = this.state.profile.name;
  }

  renderTanggal() {
    this.dom.todayLabel.textContent = `${formatTanggal(hariIni())} • pekan ke-${pekanAkademik()}`;
  }

  /** Daftar tugas + statistik kecil di header panel. */
  renderTugas() {
    const { taskList, taskEmpty, taskCount } = this.dom;
    const { query, status, sort } = this.filter;
    const kataKunci = query.trim().toLowerCase();

    const hasil = this.state.tasks
      .filter(({ done }) => status === 'all' || (status === 'done' ? done : !done))
      .filter(({ title, course }) => `${title} ${course}`.toLowerCase().includes(kataKunci))
      .sort(TaskItem.comparator(sort));

    taskList.innerHTML = hasil.map((tugas) => this.kartuTugas(tugas)).join('');
    taskEmpty.hidden = hasil.length > 0;
    taskEmpty.textContent = this.state.tasks.length === 0
      ? 'Belum ada tugas. Klik "+ Tambah Tugas" untuk mulai produktif 🚀'
      : 'Tidak ada tugas yang cocok dengan pencarian/filter kamu 🔍';
    taskCount.textContent = `${hasil.length} dari ${this.state.tasks.length} tugas`;
  }

  /** Template satu baris tugas. */
  kartuTugas(tugas) {
    const { id, title, course, priority, dueDate, done, isOverdue } = tugas;
    const kelas = ['task', done && 'is-done', isOverdue && 'is-overdue'].filter(Boolean).join(' ');

    return `
      <li class="${kelas}" data-id="${id}">
        <label class="check" title="${done ? 'Tandai belum selesai' : 'Tandai selesai'}">
          <input type="checkbox" data-action="toggle" ${done ? 'checked' : ''} aria-label="Tandai tugas selesai" />
          <span class="mark"></span>
        </label>

        <div class="task__body">
          <p class="task__title">${amanHtml(title)}</p>
          <div class="task__meta">
            ${course ? `<span class="chip chip--course">📚 ${amanHtml(course)}</span>` : ''}
            <span class="chip chip--${priority}">⚑ Prioritas ${tugas.priorityMeta.label}</span>
            ${dueDate ? `<span class="chip ${isOverdue ? 'chip--danger' : ''}">🗓️ ${formatTanggal(dueDate)} • ${tugas.deadlineLabel}</span>` : ''}
          </div>
        </div>

        <div class="task__actions">
          <button type="button" class="icon-btn" data-action="edit" title="Edit tugas" aria-label="Edit tugas">✏️</button>
          <button type="button" class="icon-btn" data-action="delete" title="Hapus tugas" aria-label="Hapus tugas">🗑️</button>
        </div>
      </li>`;
  }

  /** Kartu statistik + progress bar. */
  renderStatistik() {
    const { tasks, schedule } = this.state;
    const total = tasks.length;
    const selesai = tasks.filter(({ done }) => done).length;
    const telat = tasks.filter(({ isOverdue }) => isOverdue).length;
    const belum = total - selesai;
    const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;
    const kelasHariIni = schedule.filter(({ isToday }) => isToday).length;

    const { statTotal, statPending, statDone, statOverdue, progressBar, progressText, statsHint } = this.dom;
    statTotal.textContent = total;
    statPending.textContent = belum;
    statDone.textContent = selesai;
    statOverdue.textContent = telat;
    progressBar.style.width = `${persen}%`;
    progressText.textContent = `${persen}%`;
    statsHint.textContent = kelasHariIni > 0 ? `📌 ${kelasHariIni} kelas hari ini` : '🎉 Tidak ada kelas hari ini';
  }

  /** Jadwal kuliah dikelompokkan per hari. */
  renderJadwal() {
    const { scheduleList, scheduleEmpty } = this.dom;
    const urut = [...this.state.schedule].sort(ScheduleItem.comparator);

    const kelompok = HARI_KULIAH
      .map((hari) => ({ hari, daftar: urut.filter(({ day }) => day === hari) }))
      .filter(({ daftar }) => daftar.length > 0);

    scheduleList.innerHTML = kelompok.map(({ hari, daftar }) => `
      <div class="schedule__day">
        <p class="schedule__day-head">
          ${hari}
          ${NAMA_HARI[new Date().getDay()] === hari ? '<span class="chip chip--today">Hari ini</span>' : ''}
        </p>
        ${daftar.map((slot) => this.kartuJadwal(slot)).join('')}
      </div>`).join('');

    scheduleEmpty.hidden = kelompok.length > 0;
  }

  kartuJadwal(slot) {
    const { id, course, room, lecturer, isToday } = slot;
    const detail = [room, lecturer, `${slot.durasiMenit} menit`].filter(Boolean);

    return `
      <article class="slot ${isToday ? 'slot--today' : ''}" data-id="${id}">
        <span class="slot__time">${slot.timeRange}</span>
        <div class="slot__info">
          <p class="slot__course">${amanHtml(course)}</p>
          <p class="slot__meta">${detail.map((teks) => amanHtml(teks)).join(' • ')}</p>
        </div>
        <div class="slot__actions">
          <button type="button" class="icon-btn" data-action="edit" title="Edit jadwal" aria-label="Edit jadwal">✏️</button>
          <button type="button" class="icon-btn" data-action="delete" title="Hapus jadwal" aria-label="Hapus jadwal">🗑️</button>
        </div>
      </article>`;
  }

  renderCatatan() {
    const { noteList, noteEmpty } = this.dom;
    const urut = [...this.state.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    noteList.innerHTML = urut.map((catatan) => {
      const { id, title, ringkasan, createdAt } = catatan;
      return `
        <article class="note" data-id="${id}">
          <h3 class="note__title">${amanHtml(title)}</h3>
          <p class="note__body">${amanHtml(ringkasan)}</p>
          <div class="note__foot">
            <span class="note__date">🕒 ${formatTanggal(createdAt.slice(0, 10))}</span>
            <span>
              <button type="button" class="icon-btn" data-action="edit" title="Edit catatan" aria-label="Edit catatan">✏️</button>
              <button type="button" class="icon-btn" data-action="delete" title="Hapus catatan" aria-label="Hapus catatan">🗑️</button>
            </span>
          </div>
        </article>`;
    }).join('');

    noteEmpty.hidden = urut.length > 0;
  }

  /* ==========================================================================
   * 5. CRUD TUGAS
   * ======================================================================= */
  /** Helper immutable: ganti satu item berdasarkan id. */
  gantiItem(koleksi, id, mutator) {
    return koleksi.map((item) => (item.id === id ? mutator(item) : item));
  }

  tambahTugas(data) {
    // Spread operator: membuat array baru (state tetap immutable).
    this.state.tasks = [TaskItem.fromJSON(data), ...this.state.tasks];
    this.simpanState();
    this.renderTugas();
    this.renderStatistik();
    this.toast('Tugas baru berhasil ditambahkan ✅', 'success');
  }

  perbaruiTugas(id, patch) {
    this.state.tasks = this.gantiItem(this.state.tasks, id, (tugas) =>
      TaskItem.fromJSON({ ...tugas.toJSON(), ...patch, updatedAt: new Date().toISOString() }));
    this.simpanState();
    this.renderTugas();
    this.renderStatistik();
  }

  toggleTugas(id) {
    this.state.tasks = this.gantiItem(this.state.tasks, id, (tugas) =>
      TaskItem.fromJSON({ ...tugas.toJSON(), done: !tugas.done }));
    this.simpanState();
    this.renderTugas();
    this.renderStatistik();
  }

  hapusTugas(tugas) {
    if (!confirm(`Hapus tugas "${tugas.title}"?`)) return;
    this.state.tasks = this.state.tasks.filter(({ id }) => id !== tugas.id);
    this.simpanState();
    this.renderTugas();
    this.renderStatistik();
    this.toast('Tugas dihapus 🗑️', 'info');
  }

  tanganiKlikTugas(event) {
    const tombol = event.target.closest('[data-action]');
    if (!tombol || tombol.dataset.action === 'toggle') return;

    const { id } = tombol.closest('[data-id]').dataset;
    const tugas = this.state.tasks.find((item) => item.id === id);
    if (!tugas) return;

    if (tombol.dataset.action === 'edit') this.bukaFormTugas(tugas);
    if (tombol.dataset.action === 'delete') this.hapusTugas(tugas);
  }

  tanganiToggleTugas(event) {
    const kotak = event.target.closest('input[data-action="toggle"]');
    if (!kotak) return;
    this.toggleTugas(kotak.closest('[data-id]').dataset.id);
  }

  bukaFormTugas(tugas = null) {
    const { taskDialog, taskForm, taskDialogTitle, taskTitle, taskCourse, taskPriority, taskDue } = this.dom;
    taskForm.reset();
    this.editing.task = tugas?.id ?? null;
    taskDialogTitle.textContent = tugas ? 'Edit Tugas' : 'Tambah Tugas';

    if (tugas) {
      taskTitle.value = tugas.title;
      taskCourse.value = tugas.course;
      taskPriority.value = tugas.priority;
      taskDue.value = tugas.dueDate;
    }

    taskDialog.showModal();
    taskTitle.focus();
  }

  simpanFormTugas(event) {
    event.preventDefault();
    const { value: title } = this.dom.taskTitle; // destructuring nilai input
    if (!title.trim()) {
      this.toast('Judul tugas tidak boleh kosong.', 'error');
      this.dom.taskTitle.focus();
      return;
    }

    const data = {
      title,
      course: this.dom.taskCourse.value,
      priority: this.dom.taskPriority.value,
      dueDate: this.dom.taskDue.value,
    };

    if (this.editing.task) {
      this.perbaruiTugas(this.editing.task, data);
      this.toast('Perubahan tugas disimpan ✅', 'success');
    } else {
      this.tambahTugas(data);
    }

    this.editing.task = null;
    this.dom.taskDialog.close();
  }

  /* ==========================================================================
   * 6. CRUD JADWAL KULIAH
   * ======================================================================= */
  simpanJadwal() {
    this.simpanState();
    this.renderJadwal();
    this.renderStatistik();
  }

  bukaFormJadwal(slot = null) {
    const { scheduleDialog, scheduleForm, scheduleDialogTitle } = this.dom;
    scheduleForm.reset();
    this.editing.schedule = slot?.id ?? null;
    scheduleDialogTitle.textContent = slot ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah';

    if (slot) {
      this.dom.scheduleCourse.value = slot.course;
      this.dom.scheduleDay.value = slot.day;
      this.dom.scheduleStart.value = slot.start;
      this.dom.scheduleEnd.value = slot.end;
      this.dom.scheduleRoom.value = slot.room;
      this.dom.scheduleLecturer.value = slot.lecturer;
    } else {
      // Nilai awal praktis: hari ini (bila kuliah) dengan jam 08:00–10:00.
      const hariSekarang = NAMA_HARI[new Date().getDay()];
      this.dom.scheduleDay.value = HARI_KULIAH.includes(hariSekarang) ? hariSekarang : 'Senin';
      this.dom.scheduleStart.value = '08:00';
      this.dom.scheduleEnd.value = '10:00';
    }

    scheduleDialog.showModal();
    this.dom.scheduleCourse.focus();
  }

  simpanFormJadwal(event) {
    event.preventDefault();
    const data = {
      course: this.dom.scheduleCourse.value,
      day: this.dom.scheduleDay.value,
      start: this.dom.scheduleStart.value,
      end: this.dom.scheduleEnd.value,
      room: this.dom.scheduleRoom.value,
      lecturer: this.dom.scheduleLecturer.value,
    };

    if (!data.course.trim()) {
      this.toast('Nama mata kuliah wajib diisi.', 'error');
      this.dom.scheduleCourse.focus();
      return;
    }
    if (data.end <= data.start) {
      this.toast('Jam selesai harus lebih lambat dari jam mulai.', 'error');
      return;
    }

    if (this.editing.schedule) {
      this.state.schedule = this.gantiItem(this.state.schedule, this.editing.schedule, (item) =>
        ScheduleItem.fromJSON({ ...item.toJSON(), ...data }));
      this.toast('Jadwal kuliah diperbarui 🗓️', 'success');
    } else {
      this.state.schedule = [...this.state.schedule, ScheduleItem.fromJSON(data)];
      this.toast('Jadwal kuliah ditambahkan 🗓️', 'success');
    }

    this.editing.schedule = null;
    this.simpanJadwal();
    this.dom.scheduleDialog.close();
  }

  tanganiKlikJadwal(event) {
    const tombol = event.target.closest('[data-action]');
    if (!tombol) return;

    const { id } = tombol.closest('[data-id]').dataset;
    const slot = this.state.schedule.find((item) => item.id === id);
    if (!slot) return;

    if (tombol.dataset.action === 'edit') this.bukaFormJadwal(slot);
    if (tombol.dataset.action === 'delete') {
      if (!confirm(`Hapus jadwal "${slot.course}"?`)) return;
      this.state.schedule = this.state.schedule.filter((item) => item.id !== id);
      this.simpanJadwal();
      this.toast('Jadwal dihapus 🗑️', 'info');
    }
  }

  /* ==========================================================================
   * 7. CRUD CATATAN
   * ======================================================================= */
  bukaFormCatatan(catatan = null) {
    const { noteDialog, noteForm, noteDialogTitle } = this.dom;
    noteForm.reset();
    this.editing.note = catatan?.id ?? null;
    noteDialogTitle.textContent = catatan ? 'Edit Catatan' : 'Tambah Catatan';

    if (catatan) {
      this.dom.noteTitle.value = catatan.title;
      this.dom.noteBody.value = catatan.body;
    }

    noteDialog.showModal();
    this.dom.noteTitle.focus();
  }

  simpanFormCatatan(event) {
    event.preventDefault();
    const data = { title: this.dom.noteTitle.value, body: this.dom.noteBody.value };

    if (!data.title.trim()) {
      this.toast('Judul catatan wajib diisi.', 'error');
      this.dom.noteTitle.focus();
      return;
    }

    if (this.editing.note) {
      this.state.notes = this.gantiItem(this.state.notes, this.editing.note, (item) =>
        NoteItem.fromJSON({ ...item.toJSON(), ...data }));
      this.toast('Catatan diperbarui 📝', 'success');
    } else {
      this.state.notes = [NoteItem.fromJSON(data), ...this.state.notes];
      this.toast('Catatan baru disimpan 📝', 'success');
    }

    this.editing.note = null;
    this.simpanState();
    this.renderCatatan();
    this.dom.noteDialog.close();
  }

  tanganiKlikCatatan(event) {
    const tombol = event.target.closest('[data-action]');
    if (!tombol) return;

    const { id } = tombol.closest('[data-id]').dataset;
    const catatan = this.state.notes.find((item) => item.id === id);
    if (!catatan) return;

    if (tombol.dataset.action === 'edit') this.bukaFormCatatan(catatan);
    if (tombol.dataset.action === 'delete') {
      if (!confirm(`Hapus catatan "${catatan.title}"?`)) return;
      this.state.notes = this.state.notes.filter((item) => item.id !== id);
      this.simpanState();
      this.renderCatatan();
      this.toast('Catatan dihapus 🗑️', 'info');
    }
  }

  /* ==========================================================================
   * 8. DATA EKSTERNAL (async/await + Promise)
   * ======================================================================= */
  async muatDataEksternal() {
    // Promise.allSettled: cuaca dan kutipan dimuat bersamaan.
    const hasil = await Promise.allSettled([this.muatCuaca(), this.muatKutipan()]);
    const gagal = hasil.filter(({ status }) => status === 'rejected').length;
    if (gagal > 0) this.toast(`${gagal} data eksternal gagal dimuat. Periksa koneksi internet.`, 'error');
  }

  async muatCuaca() {
    const { weatherBtn, weatherDesc, weatherIcon, weatherTemp } = this.dom;
    weatherBtn.classList.add('is-loading');
    weatherDesc.textContent = 'Mengambil data dari Open-Meteo…';

    try {
      const cuaca = await this.api.ambilCuaca();
      this.renderCuaca(cuaca);
    } catch (error) {
      weatherIcon.textContent = '📡';
      weatherTemp.textContent = '--';
      weatherDesc.textContent = `Gagal memuat cuaca (${error.message}). Klik 🔄 untuk mencoba lagi.`;
      this.toast('Cuaca gagal dimuat. Cek koneksi internet kamu.', 'error');
    } finally {
      weatherBtn.classList.remove('is-loading');
    }
  }

  renderCuaca({ icon, label, suhu, kecepatanAngin, lokasi, diambilPada, sumber }) {
    const waktu = formatJam(new Date(diambilPada));
    this.dom.weatherIcon.textContent = icon;
    this.dom.weatherTemp.textContent = suhu;
    this.dom.weatherDesc.textContent = `${label}${sumber === 'cache' ? ' • dari cache (offline)' : ''}`;
    this.dom.weatherWind.textContent = `${kecepatanAngin} km/jam`;
    this.dom.weatherUpdated.textContent = `pukul ${waktu}`;
    this.dom.weatherPlace.textContent = lokasi;
  }

  async muatKutipan() {
    const { quoteBtn, quoteText, quoteAuthor } = this.dom;
    quoteBtn.classList.add('is-loading');
    try {
      const { kutipan, penulis, sumber } = await this.api.ambilKutipan();
      quoteText.textContent = `“${kutipan}”`;
      quoteAuthor.textContent = `— ${penulis}${sumber === 'lokal' ? ' (offline)' : ''}`;
    } finally {
      quoteBtn.classList.remove('is-loading');
    }
  }

  /* ==========================================================================
   * 9. TEMA, PROFIL, JAM, TOAST
   * ======================================================================= */
  terapkanTema(tema = this.state.settings.theme) {
    document.documentElement.dataset.theme = tema;
    this.dom.themeBtn.textContent = tema === 'dark' ? '🌙' : '☀️';
    this.dom.themeBtn.title = tema === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';
  }

  toggleTema() {
    const tema = this.state.settings.theme === 'dark' ? 'light' : 'dark';
    this.state.settings = { ...this.state.settings, theme: tema };
    this.storage.save('settings', this.state.settings);
    this.terapkanTema(tema);
    this.toast(`Tema ${tema === 'dark' ? 'gelap' : 'terang'} diaktifkan 🎨`, 'info');
  }

  ubahNama() {
    const namaBaru = prompt('Nama panggilan kamu:', this.state.profile.name);
    if (!namaBaru?.trim()) return;
    this.state.profile = { ...this.state.profile, name: namaBaru.trim() };
    this.storage.save('profile', this.state.profile);
    this.renderProfil();
    this.toast('Nama berhasil diperbarui ✏️', 'success');
  }

  jalankanJam() {
    const perbarui = () => {
      const sekarang = new Date();
      const jam = formatJam(sekarang);
      this.dom.clock.textContent = `${jam}:${String(sekarang.getSeconds()).padStart(2, '0')}`;
      this.dom.clockZone.textContent = labelZonaWaktu(sekarang);
      this.dom.greeting.textContent = sapaanWaktu(sekarang);
    };
    perbarui();
    setInterval(perbarui, 1000);
  }

  toast(pesan, tipe = 'info') {
    const ikon = { success: '✅', error: '⚠️', info: 'ℹ️' }[tipe] ?? 'ℹ️';
    const elemen = document.createElement('div');
    elemen.className = `toast toast--${tipe}`;
    elemen.innerHTML = `<span aria-hidden="true">${ikon}</span><span>${amanHtml(pesan)}</span>`;
    this.dom.toastStack.append(elemen);

    setTimeout(() => {
      elemen.classList.add('is-hiding');
      elemen.addEventListener('animationend', () => elemen.remove(), { once: true });
    }, 3800);
  }

  /* ==========================================================================
   * 10. BACKUP: EKSPOR, IMPOR, RESET
   * ======================================================================= */
  bangunPayload() {
    const { tasks, notes, schedule, profile, settings } = this.state;
    return {
      aplikasi: 'Web Menuju Ambis',
      versi: 1,
      dieksporPada: new Date().toISOString(),
      data: { tasks, notes, schedule, profile, settings },
    };
  }

  eksporData() {
    const isi = JSON.stringify(this.bangunPayload(), null, 2); // toJSON() dipakai otomatis
    const blob = new Blob([isi], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = `web-menuju-ambis-${hariIni()}.json`;
    tautan.click();
    URL.revokeObjectURL(url);
    this.toast('Backup data berhasil diunduh 📤', 'success');
  }

  /** Impor file JSON — FileReader dibungkus Promise (bacaFileSebagaiTeks). */
  async imporData(file) {
    if (!file) return;
    try {
      const teks = await bacaFileSebagaiTeks(file);
      const { data } = JSON.parse(teks); // destructuring hasil parsing
      if (!data || !Array.isArray(data.tasks)) throw new Error('Struktur file backup tidak dikenali.');
      if (!confirm('Impor akan mengganti seluruh data saat ini. Lanjutkan?')) return;

      this.state = {
        tasks: data.tasks.map((item) => TaskItem.fromJSON(item)),
        notes: (data.notes ?? []).map((item) => NoteItem.fromJSON(item)),
        schedule: (data.schedule ?? []).map((item) => ScheduleItem.fromJSON(item)),
        profile: data.profile ?? { name: 'Angken Cantik' },
        settings: data.settings ?? { theme: 'dark' },
      };

      this.simpanState();
      this.terapkanTema();
      this.renderSemua();
      this.toast(`Data diimpor: ${this.state.tasks.length} tugas, ${this.state.notes.length} catatan 📥`, 'success');
    } catch (error) {
      this.toast(`Impor gagal: ${error.message}`, 'error');
    } finally {
      this.dom.importInput.value = '';
    }
  }

  resetData() {
    if (!confirm('Hapus SEMUA data (tugas, jadwal, catatan) dan kembali ke data contoh?')) return;
    this.storage.reset();
    location.reload();
  }
}

/* Inisialisasi aplikasi setelah DOM siap. */
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new DashboardApp();
  dashboard.storage.bersihkanDataLama(); // migrasi: buang data versi nama lama (itera-dashboard:*)
  dashboard.init();
  window.dashboard = dashboard; // memudahkan debugging lewat console
});
