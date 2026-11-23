/**
 * storage.js — ScholarPath localStorage wrapper module
 * All data persistence lives here. Import order: storage.js → auth.js → ui.js → page scripts.
 */

window.Storage = class Storage {

  // ─────────────────────────────────────────────
  // Storage key constants
  // ─────────────────────────────────────────────

  static get KEYS() {
    return Object.freeze({
      USERS:         'scholarpath_users',
      SCHOLARSHIPS:  'scholarpath_scholarships',
      APPLICATIONS:  'scholarpath_applications',
      NOTIFICATIONS: 'scholarpath_notifications',
      BOOKMARKS:     'scholarpath_bookmarks',
      DRAFTS:        'scholarpath_drafts',
      SESSION:       'scholarpath_session',
      THEME:         'scholarpath_theme',
    });
  }

  // ─────────────────────────────────────────────
  // Core primitives
  // ─────────────────────────────────────────────

  /**
   * Serialize `data` to JSON and store under `key`.
   * @param {string} key
   * @param {*} data
   */
  static save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage.save] Failed to save key:', key, e);
    }
  }

  /**
   * Parse and return the stored value, or `defaultValue` if absent / parse error.
   * @param {string} key
   * @param {*} [defaultValue=null]
   * @returns {*}
   */
  static load(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage.load] Failed to load key:', key, e);
      return defaultValue;
    }
  }

  /**
   * Remove a single key from localStorage.
   * @param {string} key
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[Storage.remove] Failed to remove key:', key, e);
    }
  }

  /**
   * Wipe ALL ScholarPath keys from localStorage.
   * Does NOT touch unrelated third-party keys.
   */
  static clear() {
    Object.values(Storage.KEYS).forEach(key => Storage.remove(key));
  }

  // ─────────────────────────────────────────────
  // User management
  // ─────────────────────────────────────────────

  /**
   * Look up a single user by email (case-insensitive).
   * @param {string} email
   * @returns {Object|null}
   */
  static getUser(email) {
    if (!email) return null;
    const users = Storage.getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * Add a new user or update an existing one (matched by id).
   * @param {Object} user - must have at least `id` and `email`
   */
  static saveUser(user) {
    if (!user || !user.id) {
      console.error('[Storage.saveUser] User must have an id.');
      return;
    }
    const users = Storage.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) {
      users.push(user);
    } else {
      users[idx] = { ...users[idx], ...user };
    }
    Storage.save(Storage.KEYS.USERS, users);
  }

  /**
   * Return all registered users, ensuring demo accounts exist.
   * @returns {Object[]}
   */
  static getAllUsers() {
    let users = Storage.load(Storage.KEYS.USERS, []);
    let updated = false;

    // Seed Demo Student if missing
    if (!users.some(u => u.email.toLowerCase() === 'arjun@student.com')) {
      users.push({
        id: 'usr_student_demo',
        name: 'Arjun Sharma',
        email: 'arjun@student.com',
        password: 'VTNSMVpHVnVkRUF4TWpOZmMzQmZjMkZzZEY5Mk1RPT0=', // Student@123
        role: 'student',
        phone: '9876543210',
        dob: '2003-05-15',
        gender: 'male',
        course: 'B.Tech CSE',
        year: 3,
        institution: 'Dayananda Sagar University',
        university: 'Dayananda Sagar University',
        cgpa: 8.75,
        tenthPercentage: 92.4,
        twelfthPercentage: 89.6,
        category: 'General',
        income: 240000,
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        address: 'DSU Innovation Campus, Kudlu Gate, Hosur Road',
        city: 'Bengaluru',
        pincode: '560068',
        isDisability: false,
        createdAt: '2024-08-01T10:00:00.000Z'
      });
      updated = true;
    }

    // Seed Demo Admin if missing
    if (!users.some(u => u.email.toLowerCase() === 'admin@scholarpath.in')) {
      users.push({
        id: 'usr_admin_demo',
        name: 'Syed Fazil (Admin)',
        email: 'admin@scholarpath.in',
        password: 'UVdSdGFXNUFNVEl6WDNOd1gzTmhiSFJmZGpFPQ==', // Admin@123
        role: 'admin',
        phone: '9988776655',
        institution: 'Dayananda Sagar University',
        createdAt: '2024-01-01T00:00:00.000Z'
      });
      updated = true;
    }

    if (updated) {
      Storage.save(Storage.KEYS.USERS, users);
    }
    return users;
  }

  // ─────────────────────────────────────────────
  // Scholarship management
  // ─────────────────────────────────────────────

  /**
   * Load scholarships from localStorage, seeding from window.ScholarData.scholarships
   * on first run if that global is available.
   * @returns {Object[]}
   */
  static getScholarships() {
    const stored = Storage.load(Storage.KEYS.SCHOLARSHIPS, null);
    if (stored !== null) return stored;

    // Seed from global ScholarData if present
    if (
      window.ScholarData &&
      Array.isArray(window.ScholarData.scholarships) &&
      window.ScholarData.scholarships.length > 0
    ) {
      Storage.save(Storage.KEYS.SCHOLARSHIPS, window.ScholarData.scholarships);
      return window.ScholarData.scholarships;
    }

    // No seed available — return empty array
    Storage.save(Storage.KEYS.SCHOLARSHIPS, []);
    return [];
  }

  /**
   * Add or update a scholarship (matched by id).
   * @param {Object} scholarship - must have `id`
   */
  static saveScholarship(scholarship) {
    if (!scholarship || !scholarship.id) {
      console.error('[Storage.saveScholarship] Scholarship must have an id.');
      return;
    }
    const list = Storage.getScholarships();
    const idx = list.findIndex(s => s.id === scholarship.id);
    if (idx === -1) {
      list.push(scholarship);
    } else {
      list[idx] = { ...list[idx], ...scholarship };
    }
    Storage.save(Storage.KEYS.SCHOLARSHIPS, list);
  }

  /**
   * Remove a scholarship by id.
   * @param {string|number} id
   */
  static deleteScholarship(id) {
    const list = Storage.getScholarships().filter(s => s.id !== id);
    Storage.save(Storage.KEYS.SCHOLARSHIPS, list);
  }

  // ─────────────────────────────────────────────
  // Application management
  // ─────────────────────────────────────────────

  /**
   * Return all applications, optionally filtered by userId. Seeds realistic demo data if empty.
   * @param {string|null} [userId=null]
   * @returns {Object[]}
   */
  static getApplications(userId = null) {
    let all = Storage.load(Storage.KEYS.APPLICATIONS, null);
    if (all === null || !Array.isArray(all) || all.length === 0) {
      all = [
        {
          id: "APP-2025-48192",
          userId: "usr_student_demo",
          userName: "Arjun Sharma",
          userEmail: "arjun@student.com",
          userPhone: "9876543210",
          scholarshipId: "SCH001",
          scholarshipName: "Prime Minister's Scholarship Scheme",
          provider: "Ministry of Education",
          amount: 36000,
          amountDisplay: "₹36,000/year",
          submittedAt: "2025-01-15T09:30:00.000Z",
          status: "Verified",
          timeline: [
            { step: "Submitted", date: "2025-01-15", done: true, remarks: "Application received and acknowledged." },
            { step: "Under Review", date: "2025-01-22", done: true, remarks: "Documents examined by scrutiny cell." },
            { step: "Verified", date: "2025-02-05", done: true, remarks: "Institutional verification completed by DSU nodal officer." },
            { step: "Approved", date: null, done: false, remarks: "Final sanction order pending disbursement." }
          ],
          remarks: "Institutional bonafide verified successfully.",
          academicDetails: { course: "B.Tech CSE", year: 3, cgpa: 8.75, college: "Dayananda Sagar University" },
          bankDetails: { bankName: "State Bank of India", ifsc: "SBIN0040512", accNo: "••••••••4829" }
        },
        {
          id: "APP-2025-72014",
          userId: "usr_student_demo",
          userName: "Arjun Sharma",
          userEmail: "arjun@student.com",
          userPhone: "9876543210",
          scholarshipId: "SCH007",
          scholarshipName: "Reliance Foundation Undergraduate Scholarship",
          provider: "Reliance Foundation",
          amount: 200000,
          amountDisplay: "₹2,00,000 (total)",
          submittedAt: "2025-02-01T14:15:00.000Z",
          status: "Under Review",
          timeline: [
            { step: "Submitted", date: "2025-02-01", done: true, remarks: "Application form and aptitude test score received." },
            { step: "Under Review", date: "2025-02-10", done: true, remarks: "Evaluation committee review in progress." },
            { step: "Verified", date: null, done: false, remarks: "" },
            { step: "Approved", date: null, done: false, remarks: "" }
          ],
          remarks: "Shortlisted for Round 2 evaluation.",
          academicDetails: { course: "B.Tech CSE", year: 3, cgpa: 8.75, college: "Dayananda Sagar University" },
          bankDetails: { bankName: "HDFC Bank", ifsc: "HDFC0001234", accNo: "••••••••9102" }
        },
        {
          id: "APP-2025-10385",
          userId: "usr_student_demo",
          userName: "Arjun Sharma",
          userEmail: "arjun@student.com",
          userPhone: "9876543210",
          scholarshipId: "SCH009",
          scholarshipName: "HDFC Badhte Kadam Scholarship",
          provider: "HDFC Bank",
          amount: 100000,
          amountDisplay: "₹1,00,000/year",
          submittedAt: "2024-11-20T11:00:00.000Z",
          status: "Approved",
          timeline: [
            { step: "Submitted", date: "2024-11-20", done: true, remarks: "Application submitted." },
            { step: "Under Review", date: "2024-12-05", done: true, remarks: "Academic scrutiny cleared." },
            { step: "Verified", date: "2024-12-20", done: true, remarks: "Income proof and bonafide validated." },
            { step: "Approved", date: "2025-01-10", done: true, remarks: "Disbursement batch #47 processed to student bank account." }
          ],
          remarks: "Sanction letter issued. Disbursed ₹1,00,000 via DBT.",
          academicDetails: { course: "B.Tech CSE", year: 3, cgpa: 8.75, college: "Dayananda Sagar University" },
          bankDetails: { bankName: "State Bank of India", ifsc: "SBIN0040512", accNo: "••••••••4829" }
        }
      ];
      Storage.save(Storage.KEYS.APPLICATIONS, all);
    }
    if (userId === null) return all;
    return all.filter(a => a.userId === userId);
  }

  /**
   * Add or update an application (matched by id).
   * @param {Object} app - must have `id`
   */
  static saveApplication(app) {
    if (!app || !app.id) {
      console.error('[Storage.saveApplication] Application must have an id.');
      return;
    }
    const all = Storage.load(Storage.KEYS.APPLICATIONS, []);
    const idx = all.findIndex(a => a.id === app.id);
    if (idx === -1) {
      all.push(app);
    } else {
      all[idx] = { ...all[idx], ...app };
    }
    Storage.save(Storage.KEYS.APPLICATIONS, all);
  }

  /**
   * Remove an application by id.
   * @param {string|number} id
   */
  static deleteApplication(id) {
    const all = Storage.load(Storage.KEYS.APPLICATIONS, []).filter(a => a.id !== id);
    Storage.save(Storage.KEYS.APPLICATIONS, all);
  }

  // ─────────────────────────────────────────────
  // Notification management
  // ─────────────────────────────────────────────

  /**
   * Return all notifications for a user.
   * @param {string} userId
   * @returns {Object[]}
   */
  static getNotifications(userId) {
    const all = Storage.load(Storage.KEYS.NOTIFICATIONS, {});
    if ((!all[userId] || all[userId].length === 0) && userId === 'usr_student_demo') {
      all[userId] = [
        { id: 'notif_1', title: 'Application Verified', message: 'Your application for Prime Minister\'s Scholarship Scheme has been verified by the DSU nodal officer.', timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), read: false },
        { id: 'notif_2', title: 'Scholarship Disbursed! 🎉', message: 'HDFC Badhte Kadam Scholarship amount of ₹1,00,000 has been credited via DBT.', timestamp: new Date(Date.now() - 3600000 * 24 * 8).toISOString(), read: false },
        { id: 'notif_3', title: 'Upcoming Deadline Alert', message: 'Reliance Foundation Undergraduate Scholarship deadline is approaching soon.', timestamp: new Date(Date.now() - 3600000 * 24 * 12).toISOString(), read: true }
      ];
      Storage.save(Storage.KEYS.NOTIFICATIONS, all);
    }
    return all[userId] || [];
  }

  /**
   * Push a notification into the user's notification array.
   * @param {string} userId
   * @param {Object} notification - should include `id`, `message`, `timestamp`
   */
  static addNotification(userId, notification) {
    const all = Storage.load(Storage.KEYS.NOTIFICATIONS, {});
    if (!all[userId]) all[userId] = [];
    all[userId].unshift({ ...notification, read: false });
    Storage.save(Storage.KEYS.NOTIFICATIONS, all);
  }

  /**
   * Mark a specific notification as read for a user.
   * @param {string} userId
   * @param {string|number} notifId
   */
  static markNotificationRead(userId, notifId) {
    const all = Storage.load(Storage.KEYS.NOTIFICATIONS, {});
    if (!all[userId]) return;
    all[userId] = all[userId].map(n =>
      n.id === notifId ? { ...n, read: true } : n
    );
    Storage.save(Storage.KEYS.NOTIFICATIONS, all);
  }

  // ─────────────────────────────────────────────
  // Bookmark management
  // ─────────────────────────────────────────────

  /**
   * Return array of bookmarked scholarship IDs for a user.
   * @param {string} userId
   * @returns {Array<string|number>}
   */
  static getBookmarks(userId) {
    const all = Storage.load(Storage.KEYS.BOOKMARKS, {});
    if ((!all[userId] || all[userId].length === 0) && userId === 'usr_student_demo') {
      all[userId] = ['SCH001', 'SCH007', 'SCH009'];
      Storage.save(Storage.KEYS.BOOKMARKS, all);
    }
    return all[userId] || [];
  }

  /**
   * Toggle a scholarship bookmark for a user.
   * Adds if not present; removes if already bookmarked.
   * @param {string} userId
   * @param {string|number} scholarshipId
   * @returns {boolean} true if now bookmarked, false if removed
   */
  static toggleBookmark(userId, scholarshipId) {
    const all = Storage.load(Storage.KEYS.BOOKMARKS, {});
    if (!all[userId]) all[userId] = [];
    const idx = all[userId].indexOf(scholarshipId);
    if (idx === -1) {
      all[userId].push(scholarshipId);
      Storage.save(Storage.KEYS.BOOKMARKS, all);
      return true;
    } else {
      all[userId].splice(idx, 1);
      Storage.save(Storage.KEYS.BOOKMARKS, all);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // Session management
  // ─────────────────────────────────────────────

  /**
   * Return the currently logged-in user object from session storage.
   * @returns {Object|null}
   */
  static getCurrentUser() {
    return Storage.load(Storage.KEYS.SESSION, null);
  }

  /**
   * Persist a user object to session (login state).
   * @param {Object} user
   */
  static setCurrentUser(user) {
    Storage.save(Storage.KEYS.SESSION, user);
  }

  /**
   * Destroy the current session (logout).
   */
  static clearSession() {
    Storage.remove(Storage.KEYS.SESSION);
  }

  // ─────────────────────────────────────────────
  // Draft management
  // ─────────────────────────────────────────────

  /**
   * Return all draft applications for a user.
   * @param {string} userId
   * @returns {Object} keyed by scholarshipId
   */
  static getDrafts(userId) {
    const all = Storage.load(Storage.KEYS.DRAFTS, {});
    return all[userId] || {};
  }

  /**
   * Save or update a draft for a specific scholarship.
   * @param {string} userId
   * @param {string|number} scholarshipId
   * @param {Object} draftData
   */
  static saveDraft(userId, scholarshipId, draftData) {
    const all = Storage.load(Storage.KEYS.DRAFTS, {});
    if (!all[userId]) all[userId] = {};
    all[userId][scholarshipId] = {
      ...draftData,
      savedAt: new Date().toISOString(),
    };
    Storage.save(Storage.KEYS.DRAFTS, all);
  }

  /**
   * Remove a draft for a specific scholarship.
   * @param {string} userId
   * @param {string|number} scholarshipId
   */
  static deleteDraft(userId, scholarshipId) {
    const all = Storage.load(Storage.KEYS.DRAFTS, {});
    if (all[userId]) {
      delete all[userId][scholarshipId];
      Storage.save(Storage.KEYS.DRAFTS, all);
    }
  }

  // ─────────────────────────────────────────────
  // Theme management
  // ─────────────────────────────────────────────

  /**
   * Return the saved theme preference.
   * @returns {'light'|'dark'}
   */
  static getTheme() {
    return Storage.load(Storage.KEYS.THEME, 'light');
  }

  /**
   * Persist the theme preference.
   * @param {'light'|'dark'} theme
   */
  static setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('[Storage.setTheme] Invalid theme:', theme, '— must be "light" or "dark".');
      return;
    }
    Storage.save(Storage.KEYS.THEME, theme);
  }
};
