/**
 * auth.js — ScholarPath authentication & authorization module
 * Depends on: storage.js (window.Storage)
 * Import order: storage.js → auth.js → ui.js → page scripts
 */

window.Auth = class Auth {

  // ─────────────────────────────────────────────
  // Password utilities
  // ─────────────────────────────────────────────

  /**
   * NOTE: This is NOT cryptographically secure. It is a simple Base64 obfuscation
   * used for client-side demo purposes only. In a production environment, passwords
   * MUST be hashed server-side using bcrypt / Argon2 / PBKDF2.
   * @param {string} pass
   * @returns {string}
   */
  static hashPassword(pass) {
    // Double-encode to make casual inspection slightly harder
    return btoa(btoa(pass + '_sp_salt_v1'));
  }

  /**
   * Verify a plain-text password against a stored hashed value.
   * @param {string} plain
   * @param {string} hashed
   * @returns {boolean}
   */
  static #verifyPassword(plain, hashed) {
    return Auth.hashPassword(plain) === hashed;
  }

  // ─────────────────────────────────────────────
  // Validators
  // ─────────────────────────────────────────────

  /**
   * Validate an email address.
   * @param {string} email
   * @returns {{ valid: boolean, message: string }}
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, message: 'Email is required.' };
    }
    const trimmed = email.trim();
    // RFC-5321 simplified regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true, message: 'Email is valid.' };
  }

  /**
   * Validate a 10-digit Indian mobile number.
   * @param {string} phone
   * @returns {{ valid: boolean, message: string }}
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, message: 'Phone number is required.' };
    }
    const digits = phone.trim().replace(/\D/g, '');
    if (digits.length !== 10) {
      return { valid: false, message: 'Phone number must be exactly 10 digits.' };
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { valid: false, message: 'Enter a valid Indian mobile number (starts with 6-9).' };
    }
    return { valid: true, message: 'Phone number is valid.' };
  }

  /**
   * Validate password complexity.
   * Requirements: ≥8 chars, at least one uppercase, one digit, one special character.
   * @param {string} pass
   * @returns {{ valid: boolean, message: string }}
   */
  static validatePassword(pass) {
    if (!pass || typeof pass !== 'string') {
      return { valid: false, message: 'Password is required.' };
    }
    if (pass.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(pass)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[0-9]/.test(pass)) {
      return { valid: false, message: 'Password must contain at least one digit.' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pass)) {
      return { valid: false, message: 'Password must contain at least one special character.' };
    }
    return { valid: true, message: 'Password meets requirements.' };
  }

  /**
   * Calculate a password strength score.
   * @param {string} pass
   * @returns {{ score: number, label: 'Weak'|'Fair'|'Good'|'Strong', color: string }}
   */
  static getPasswordStrength(pass) {
    if (!pass) return { score: 0, label: 'Weak', color: '#e74c3c' };

    let score = 0;

    // Length bonuses
    if (pass.length >= 8)  score++;
    if (pass.length >= 12) score++;

    // Character variety
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pass)) score++;

    // Penalise very short passwords
    if (pass.length < 6) score = Math.max(score - 2, 0);

    // Normalise to 0-4 range
    const normalised = Math.min(Math.floor(score / 1.5), 4);

    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#e74c3c', '#e74c3c', '#f39c12', '#27ae60', '#2ecc71'];

    return {
      score: normalised,
      label: labels[normalised],
      color: colors[normalised],
    };
  }

  // ─────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────

  /**
   * Validate inputs and register a new student user.
   *
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {string} userData.phone
   * @param {string} userData.dob        — ISO date string or DD/MM/YYYY
   * @param {string} userData.gender
   * @param {string} userData.course
   * @param {string} userData.year       — academic year (e.g. "2")
   * @param {string} userData.institution
   * @param {string|number} userData.cgpa
   * @param {string} userData.category   — General / OBC / SC / ST / EWS
   * @param {string|number} userData.income — annual family income in INR
   * @param {string} userData.state
   * @returns {{ success: boolean, message: string, user?: Object }}
   */
  static register(userData) {
    const {
      name, email, password, phone,
      dob, gender, isDisability, course, year,
      institution, cgpa, tenthPercentage, twelfthPercentage,
      category, income, state, district,
    } = userData || {};

    // ── Required field presence checks ──
    if (!name || !name.trim()) {
      return { success: false, message: 'Full name is required.' };
    }
    if (name.trim().length < 2) {
      return { success: false, message: 'Name must be at least 2 characters.' };
    }

    // ── Email ──
    const emailCheck = Auth.validateEmail(email);
    if (!emailCheck.valid) return { success: false, message: emailCheck.message };

    // Duplicate email guard
    if (Storage.getUser(email)) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    // ── Password ──
    const passCheck = Auth.validatePassword(password);
    if (!passCheck.valid) return { success: false, message: passCheck.message };

    // ── Phone ──
    const phoneCheck = Auth.validatePhone(phone);
    if (!phoneCheck.valid) return { success: false, message: phoneCheck.message };

    // ── Date of birth ──
    if (!dob) return { success: false, message: 'Date of birth is required.' };
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      return { success: false, message: 'Invalid date of birth.' };
    }
    const ageMs = Date.now() - dobDate.getTime();
    const ageMsPerYear = 1000 * 60 * 60 * 24 * 365.25;
    const age = ageMs / ageMsPerYear;
    if (age < 10 || age > 60) {
      return { success: false, message: 'Age must be between 10 and 60 years.' };
    }

    // ── Gender ──
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!gender || !validGenders.includes(gender.toLowerCase().replace(/ /g, '_'))) {
      return { success: false, message: 'Please select a valid gender.' };
    }

    // ── CGPA ──
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      return { success: false, message: 'CGPA must be a number between 0 and 10.' };
    }
    const tenthNum = Number(tenthPercentage);
    if (!Number.isFinite(tenthNum) || tenthNum < 0 || tenthNum > 100) {
      return { success: false, message: 'Class 10 percentage must be between 0 and 100.' };
    }
    const twelfthNum = Number(twelfthPercentage);
    if (!Number.isFinite(twelfthNum) || twelfthNum < 0 || twelfthNum > 100) {
      return { success: false, message: 'Class 12 percentage must be between 0 and 100.' };
    }

    // ── Category ──
    const validCategories = ['general', 'obc', 'sc', 'st', 'ews'];
    if (!category || !validCategories.includes(category.toLowerCase())) {
      return { success: false, message: 'Please select a valid category (General, OBC, SC, ST, EWS).' };
    }

    // ── Income ──
    const incomeNum = parseFloat(income);
    if (isNaN(incomeNum) || incomeNum < 0) {
      return { success: false, message: 'Annual family income must be a non-negative number.' };
    }

    // ── Remaining required fields ──
    if (!course || !course.trim()) return { success: false, message: 'Course / programme is required.' };
    if (!year)                     return { success: false, message: 'Academic year is required.' };
    if (!institution || !institution.trim()) return { success: false, message: 'Institution name is required.' };
    if (!state || !state.trim())   return { success: false, message: 'State is required.' };
    if (!district || !district.trim()) return { success: false, message: 'District / city is required.' };

    // ── Build user object ──
    const newUser = {
      id:          `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role:        'student',
      name:        name.trim(),
      email:       email.trim().toLowerCase(),
      password:    Auth.hashPassword(password),
      phone:       phone.trim().replace(/\D/g, ''),
      dob:         dobDate.toISOString().split('T')[0],
      gender:      gender.toLowerCase().replace(/ /g, '_'),
      course:      course.trim(),
      year:        String(year),
      institution: institution.trim(),
      cgpa:        cgpaNum,
      tenthPercentage: tenthNum,
      twelfthPercentage: twelfthNum,
      category:    category.toLowerCase(),
      income:      incomeNum,
      state:       state.trim(),
      district:    district.trim(),
      isDisability: Boolean(isDisability),
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      avatar:      null,
    };

    Storage.saveUser(newUser);

    // Send welcome notification
    Storage.addNotification(newUser.id, {
      id:        `notif_${Date.now()}`,
      type:      'welcome',
      title:     'Welcome to ScholarPath!',
      message:   `Hi ${newUser.name}, your account has been created successfully. Start exploring scholarships now.`,
      timestamp: new Date().toISOString(),
      link:      'scholarships.html',
    });

    // Return a sanitised copy (no password hash)
    const { password: _pw, ...safeUser } = newUser;
    return { success: true, message: 'Registration successful! Welcome to ScholarPath.', user: safeUser };
  }

  // ─────────────────────────────────────────────
  // Login / Logout
  // ─────────────────────────────────────────────

  /**
   * Verify credentials and start a session.
   * @param {string} email
   * @param {string} password
   * @returns {{ success: boolean, message: string, user?: Object }}
   */
  static login(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    const user = Storage.getUser(email);
    if (!user) {
      // Generic message to prevent user enumeration
      return { success: false, message: 'Invalid email or password.' };
    }

    if (!Auth.#verifyPassword(password, user.password)) {
      return { success: false, message: 'Invalid email or password.' };
    }

    // Build safe session object (strip password hash)
    const { password: _pw, ...sessionUser } = user;
    sessionUser.lastLogin = new Date().toISOString();

    // Persist updated lastLogin back to user store
    Storage.saveUser({ ...user, lastLogin: sessionUser.lastLogin });

    Storage.setCurrentUser(sessionUser);

    return { success: true, message: 'Login successful.', user: sessionUser };
  }

  /**
   * Destroy session and redirect to index page.
   */
  static logout() {
    Storage.clearSession();
    window.location.href = 'index.html';
  }

  // ─────────────────────────────────────────────
  // Session & guards
  // ─────────────────────────────────────────────

  /**
   * Returns true if a user session currently exists.
   * @returns {boolean}
   */
  static isLoggedIn() {
    return Storage.getCurrentUser() !== null;
  }

  /**
   * Return the current user from session, or null.
   * @returns {Object|null}
   */
  static getCurrentUser() {
    return Storage.getCurrentUser();
  }

  /**
   * Redirect to login if no session exists.
   * @param {string} [redirectTo='login.html']
   */
  static requireAuth(redirectTo = 'login.html') {
    if (!Auth.isLoggedIn()) {
      // Preserve intended destination so login can redirect back
      const current = window.location.pathname.split('/').pop();
      window.location.href = `${redirectTo}?next=${encodeURIComponent(current)}`;
    }
  }

  /**
   * Redirect non-admins away from admin-only pages.
   */
  static requireAdmin() {
    Auth.requireAuth();
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      window.location.href = 'index.html';
    }
  }

  /**
   * Redirect non-students away from student-only pages.
   */
  static requireStudent() {
    Auth.requireAuth();
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'student') {
      window.location.href = 'index.html';
    }
  }

  // ─────────────────────────────────────────────
  // Profile & password management
  // ─────────────────────────────────────────────

  /**
   * Update allowed profile fields for a user.
   * Email and password cannot be changed through this method.
   * @param {string} userId
   * @param {Object} updates — partial user fields
   * @returns {{ success: boolean, message: string, user?: Object }}
   */
  static updateProfile(userId, updates) {
    if (!userId) return { success: false, message: 'User ID is required.' };

    const allUsers = Storage.getAllUsers();
    const user = allUsers.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    // Disallow changing sensitive fields through this method
    const disallowed = ['id', 'email', 'password', 'role', 'createdAt'];
    const sanitised = { ...updates };
    disallowed.forEach(k => delete sanitised[k]);

    // Individual field validation where relevant
    if (sanitised.phone !== undefined) {
      const phoneCheck = Auth.validatePhone(sanitised.phone);
      if (!phoneCheck.valid) return { success: false, message: phoneCheck.message };
      sanitised.phone = sanitised.phone.toString().replace(/\D/g, '');
    }

    if (sanitised.cgpa !== undefined) {
      const cgpaNum = parseFloat(sanitised.cgpa);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return { success: false, message: 'CGPA must be between 0 and 10.' };
      }
      sanitised.cgpa = cgpaNum;
    }

    const updatedUser = { ...user, ...sanitised, updatedAt: new Date().toISOString() };
    Storage.saveUser(updatedUser);

    // Refresh session if updating the currently logged-in user
    const session = Storage.getCurrentUser();
    if (session && session.id === userId) {
      const { password: _pw, ...safeUpdated } = updatedUser;
      Storage.setCurrentUser(safeUpdated);
    }

    const { password: _pw, ...safeUser } = updatedUser;
    return { success: true, message: 'Profile updated successfully.', user: safeUser };
  }

  /**
   * Change a user's password after verifying the old one.
   * @param {string} userId
   * @param {string} oldPass
   * @param {string} newPass
   * @returns {{ success: boolean, message: string }}
   */
  static changePassword(userId, oldPass, newPass) {
    if (!userId || !oldPass || !newPass) {
      return { success: false, message: 'All fields are required.' };
    }

    const allUsers = Storage.getAllUsers();
    const user = allUsers.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    // Verify existing password
    if (!Auth.#verifyPassword(oldPass, user.password)) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    // Validate new password complexity
    const passCheck = Auth.validatePassword(newPass);
    if (!passCheck.valid) return { success: false, message: passCheck.message };

    // Disallow reuse
    if (Auth.#verifyPassword(newPass, user.password)) {
      return { success: false, message: 'New password cannot be the same as the current password.' };
    }

    Storage.saveUser({
      ...user,
      password:  Auth.hashPassword(newPass),
      updatedAt: new Date().toISOString(),
    });

    // Notify user
    Storage.addNotification(userId, {
      id:        `notif_${Date.now()}`,
      type:      'security',
      title:     'Password Changed',
      message:   'Your password was changed successfully. If this was not you, contact support immediately.',
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Password changed successfully.' };
  }
};
