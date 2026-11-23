/**
 * apply.js — ScholarPath Application Module
 * window.ApplyModule — multi-step scholarship application logic
 */

window.ApplyModule = (function () {
  'use strict';

  /* ─────────────────────────── STATE ─────────────────────────── */
  let currentStep = 1;
  const totalSteps = 4;
  let formData = {};
  let autoSaveInterval = null;
  let currentScholarship = null;
  let currentUser = null;
  let uploadedFiles = {}; // key: docId, value: { name, size, type, dataUrl }
  let deadlineTimer = null;

  /* ─────────────────────────── INIT ─────────────────────────── */
  function init() {
    const params = new URLSearchParams(window.location.search);
    const scholarshipId = params.get('id');

    currentUser = Storage.getCurrentUser();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    if (scholarshipId) {
      loadScholarship(scholarshipId);
    } else {
      // No id — show a generic header
      renderGenericHeader();
    }

    prefillFromProfile(currentUser);
    goToStep(1);
    loadDraft(scholarshipId);
    setupAutoSave(scholarshipId);
    setupCharCounter();
    setupFileUpload();
    setupBankValidation();
    setupNavButtons();
    setupDeclarationCheckbox();
    updateTheme();
  }

  /* ─────────────────────── LOAD SCHOLARSHIP ─────────────────── */
  function loadScholarship(id) {
    const all = Storage.getScholarships ? Storage.getScholarships() : (JSON.parse(localStorage.getItem('sp_scholarships') || '[]'));
    currentScholarship = all.find(s => String(s.id) === String(id)) || null;

    if (!currentScholarship) {
      renderGenericHeader();
      return;
    }

    // Header
    const nameEl = document.getElementById('apply-scholarship-name');
    const amountEl = document.getElementById('apply-scholarship-amount');
    const deadlineEl = document.getElementById('apply-deadline-badge');

    if (nameEl) nameEl.textContent = currentScholarship.name || 'Scholarship Application';
    if (amountEl) amountEl.textContent = currentScholarship.amount
      ? '₹' + Number(currentScholarship.amount).toLocaleString('en-IN')
      : '';

    // Deadline countdown
    if (deadlineEl && currentScholarship.deadline) {
      startDeadlineCountdown(currentScholarship.deadline, deadlineEl);
    }

    // Render document upload slots for step 2
    renderDocumentSlots(currentScholarship.documentsRequired || [
      'Aadhaar Card', 'Income Certificate', 'Marksheet', 'Bonafide Certificate'
    ]);
  }

  function renderGenericHeader() {
    const nameEl = document.getElementById('apply-scholarship-name');
    if (nameEl) nameEl.textContent = 'Scholarship Application';
  }

  function startDeadlineCountdown(deadline, el) {
    function update() {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;
      if (diff <= 0) {
        el.textContent = 'Deadline Passed';
        el.classList.add('badge-danger');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      el.textContent = `⏰ ${d}d ${h}h ${m}m left`;
      el.classList.toggle('badge-warning', d < 7);
    }
    update();
    deadlineTimer = setInterval(update, 60000);
  }

  /* ─────────────────────── PREFILL FROM PROFILE ─────────────── */
  function prefillFromProfile(user) {
    if (!user) return;
    const map = {
      'pf-name': user.name || '',
      'pf-email': user.email || '',
      'pf-phone': user.phone || '',
      'pf-dob': user.dob || '',
      'pf-course': user.course || '',
      'pf-year': user.year || '',
      'pf-institution': user.institution || '',
      'pf-cgpa': user.cgpa || '',
      'pf-category': user.category || '',
      'pf-income': user.income || '',
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  }

  /* ─────────────────────── STEP NAVIGATION ───────────────────── */
  function goToStep(n) {
    if (n < 1 || n > totalSteps) return;
    currentStep = n;

    // Show/hide step panels
    for (let i = 1; i <= totalSteps; i++) {
      const panel = document.getElementById(`step-${i}`);
      if (panel) {
        panel.hidden = i !== n;
        panel.classList.toggle('active', i === n);
      }
    }

    // Hide success screen
    const successScreen = document.getElementById('success-screen');
    if (successScreen) successScreen.hidden = true;

    updateProgressBar(n);
    updateNavButtons(n);

    if (n === 4) renderReviewSummary();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgressBar(step) {
    const bar = document.getElementById('progress-fill');
    if (bar) {
      const pct = ((step - 1) / (totalSteps - 1)) * 100;
      bar.style.width = pct + '%';
    }

    for (let i = 1; i <= totalSteps; i++) {
      const dot = document.getElementById(`step-dot-${i}`);
      if (!dot) continue;
      dot.classList.remove('active', 'completed', 'pending');
      if (i < step) dot.classList.add('completed');
      else if (i === step) dot.classList.add('active');
      else dot.classList.add('pending');
    }
  }

  function updateNavButtons(step) {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const saveBtn = document.getElementById('btn-save-draft');

    if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-flex';
    if (nextBtn) {
      if (step === totalSteps) {
        nextBtn.textContent = 'Submit Application';
        nextBtn.dataset.action = 'submit';
      } else {
        nextBtn.textContent = 'Next';
        nextBtn.dataset.action = 'next';
      }
    }
    if (saveBtn) saveBtn.style.display = step === totalSteps ? 'none' : 'inline-flex';
  }

  function setupNavButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const saveBtn = document.getElementById('btn-save-draft');

    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (nextBtn.dataset.action === 'submit') {
          handleSubmit();
        } else {
          nextStep();
        }
      });
    }
    if (saveBtn) saveBtn.addEventListener('click', () => {
      collectStepData(currentStep);
      saveDraft(new URLSearchParams(window.location.search).get('id'));
      showToast('Draft saved!', 'success');
    });
  }

  function nextStep() {
    collectStepData(currentStep);
    const result = validateStep(currentStep);
    if (!result.valid) {
      showValidationErrors(result.errors);
      return;
    }
    clearValidationErrors();
    goToStep(currentStep + 1);
  }

  function prevStep() {
    collectStepData(currentStep);
    clearValidationErrors();
    goToStep(currentStep - 1);
  }

  /* ─────────────────────── VALIDATION ────────────────────────── */
  function validateStep(n) {
    const errors = [];

    if (n === 1) {
      const address = document.getElementById('addr-street');
      const city = document.getElementById('addr-city');
      const pin = document.getElementById('addr-pin');

      if (!address || !address.value.trim()) errors.push({ field: 'addr-street', msg: 'Address is required.' });
      if (!city || !city.value.trim()) errors.push({ field: 'addr-city', msg: 'City is required.' });
      if (!pin || !/^\d{6}$/.test(pin.value.trim())) errors.push({ field: 'addr-pin', msg: 'Enter a valid 6-digit PIN code.' });
    }

    if (n === 2) {
      const docs = currentScholarship && currentScholarship.documentsRequired
        ? currentScholarship.documentsRequired
        : ['Aadhaar Card', 'Income Certificate', 'Marksheet', 'Bonafide Certificate'];
      const missing = docs.filter(doc => !uploadedFiles[slugify(doc)]);
      if (missing.length > 0) {
        errors.push({ field: 'docs', msg: `Please upload: ${missing.join(', ')}` });
      }
    }

    if (n === 3) {
      const essay = document.getElementById('essay-text');
      const bankName = document.getElementById('bank-name');
      const accNo = document.getElementById('bank-acc');
      const ifsc = document.getElementById('bank-ifsc');
      const holder = document.getElementById('bank-holder');

      if (!essay || essay.value.trim().length < 200) {
        errors.push({ field: 'essay-text', msg: 'Personal statement must be at least 200 characters.' });
      }
      if (!bankName || !bankName.value.trim()) errors.push({ field: 'bank-name', msg: 'Bank name is required.' });
      if (!accNo || !/^\d{9,18}$/.test(accNo.value.trim())) errors.push({ field: 'bank-acc', msg: 'Enter a valid account number (9–18 digits).' });
      if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.value.trim().toUpperCase())) {
        errors.push({ field: 'bank-ifsc', msg: 'Invalid IFSC code (e.g., SBIN0001234).' });
      }
      if (!holder || !holder.value.trim()) errors.push({ field: 'bank-holder', msg: 'Account holder name is required.' });
    }

    if (n === 4) {
      const decl = document.getElementById('declaration-check');
      if (!decl || !decl.checked) {
        errors.push({ field: 'declaration-check', msg: 'You must accept the declaration to submit.' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  function showValidationErrors(errors) {
    clearValidationErrors();
    errors.forEach(e => {
      if (e.field === 'docs') {
        const zone = document.getElementById('doc-error-banner');
        if (zone) {
          zone.textContent = e.msg;
          zone.hidden = false;
        }
        return;
      }
      const el = document.getElementById(e.field);
      if (el) {
        el.classList.add('input-error');
        const errEl = document.createElement('span');
        errEl.className = 'field-error';
        errEl.textContent = e.msg;
        errEl.setAttribute('role', 'alert');
        el.parentNode.appendChild(errEl);
      }
    });
    // Scroll to first error
    const first = document.querySelector('.input-error, .field-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearValidationErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    const banner = document.getElementById('doc-error-banner');
    if (banner) banner.hidden = true;
  }

  /* ─────────────────────── DATA COLLECTION ───────────────────── */
  function collectStepData(n) {
    if (n === 1) {
      formData.address = {
        street: val('addr-street'),
        city: val('addr-city'),
        pin: val('addr-pin'),
        altPhone: val('addr-alt-phone'),
      };
      formData.personal = {
        name: val('pf-name'),
        email: val('pf-email'),
        phone: val('pf-phone'),
        dob: val('pf-dob'),
        course: val('pf-course'),
        year: val('pf-year'),
        institution: val('pf-institution'),
        cgpa: val('pf-cgpa'),
        category: val('pf-category'),
        income: val('pf-income'),
      };
    }

    if (n === 2) {
      formData.documents = { ...uploadedFiles };
    }

    if (n === 3) {
      formData.essay = val('essay-text');
      formData.activities = val('activities-text');
      formData.bank = {
        name: val('bank-name'),
        account: val('bank-acc'),
        ifsc: val('bank-ifsc').toUpperCase(),
        holder: val('bank-holder'),
      };
    }
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ─────────────────────── AUTO SAVE ─────────────────────────── */
  function setupAutoSave(scholarshipId) {
    // Debounced save on input
    const debouncedSave = debounce(() => {
      collectStepData(currentStep);
      saveDraft(scholarshipId);
    }, 1500);

    document.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('input', debouncedSave);
    });

    // Interval save every 30s
    autoSaveInterval = setInterval(() => {
      collectStepData(currentStep);
      saveDraft(scholarshipId);
    }, 30000);
  }

  function saveDraft(scholarshipId) {
    if (!currentUser) return;
    const draftKey = `sp_draft_${currentUser.id}_${scholarshipId || 'generic'}`;
    const draft = {
      formData,
      uploadedFileNames: Object.fromEntries(
        Object.entries(uploadedFiles).map(([k, v]) => [k, { name: v.name, size: v.size, type: v.type }])
      ),
      currentStep,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    updateAutoSaveIndicator(draft.savedAt);
  }

  function loadDraft(scholarshipId) {
    if (!currentUser) return;
    const draftKey = `sp_draft_${currentUser.id}_${scholarshipId || 'generic'}`;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      formData = draft.formData || {};

      // Re-fill step 1 editable fields
      if (formData.address) {
        setVal('addr-street', formData.address.street);
        setVal('addr-city', formData.address.city);
        setVal('addr-pin', formData.address.pin);
        setVal('addr-alt-phone', formData.address.altPhone);
      }
      if (formData.essay) setVal('essay-text', formData.essay);
      if (formData.activities) setVal('activities-text', formData.activities);
      if (formData.bank) {
        setVal('bank-name', formData.bank.name);
        setVal('bank-acc', formData.bank.account);
        setVal('bank-ifsc', formData.bank.ifsc);
        setVal('bank-holder', formData.bank.holder);
      }

      // Restore file names (not actual files)
      if (draft.uploadedFileNames) {
        Object.entries(draft.uploadedFileNames).forEach(([k, meta]) => {
          uploadedFiles[k] = { ...meta, dataUrl: null };
          updateDocSlotUI(k, meta);
        });
      }

      updateAutoSaveIndicator(draft.savedAt);
      showToast('Draft restored!', 'info');
    } catch (e) {
      console.warn('Could not load draft', e);
    }
  }

  function updateAutoSaveIndicator(isoTime) {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    const d = new Date(isoTime);
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `<span class="autosave-icon">✓</span> Draft saved at ${timeStr}`;
    el.classList.add('autosave-visible');
  }

  /* ─────────────────────── CHAR COUNTER ──────────────────────── */
  function setupCharCounter() {
    const essay = document.getElementById('essay-text');
    const charCount = document.getElementById('essay-char-count');
    const wordCount = document.getElementById('essay-word-count');

    if (!essay || !charCount) return;

    function update() {
      const len = essay.value.length;
      const words = essay.value.trim() === '' ? 0 : essay.value.trim().split(/\s+/).length;
      charCount.textContent = `${len} / 500 characters`;
      if (wordCount) wordCount.textContent = `${words} words`;

      // Color classes
      essay.classList.remove('essay-too-short', 'essay-ok', 'essay-too-long');
      charCount.classList.remove('count-short', 'count-ok', 'count-long');

      if (len < 200) {
        essay.classList.add('essay-too-short');
        charCount.classList.add('count-short');
      } else if (len <= 500) {
        essay.classList.add('essay-ok');
        charCount.classList.add('count-ok');
      } else {
        essay.classList.add('essay-too-long');
        charCount.classList.add('count-long');
      }
    }

    essay.addEventListener('input', update);
    update();
  }

  /* ─────────────────────── FILE UPLOAD ───────────────────────── */
  function renderDocumentSlots(docs) {
    const container = document.getElementById('doc-upload-container');
    if (!container) return;
    container.innerHTML = '';

    docs.forEach(docName => {
      const id = slugify(docName);
      const slot = document.createElement('div');
      slot.className = 'doc-slot';
      slot.id = `slot-${id}`;
      slot.innerHTML = `
        <div class="doc-slot-header">
          <span class="doc-slot-name">${docName}</span>
          <span class="doc-status doc-status-pending" id="doc-status-${id}" aria-live="polite">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Not Uploaded
          </span>
        </div>
        <div class="drop-zone" id="drop-zone-${id}" role="button" tabindex="0"
             aria-label="Upload ${docName}" data-docid="${id}">
          <div class="drop-zone-inner">
            <svg class="drop-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p class="drop-label">Drag & drop or <span class="drop-link">browse</span></p>
            <p class="drop-hint">PDF, JPG, PNG — max 2 MB</p>
          </div>
          <input type="file" class="file-input" id="file-${id}" accept=".pdf,.jpg,.jpeg,.png"
                 aria-label="Upload ${docName}" data-docid="${id}" />
        </div>
        <div class="doc-preview" id="preview-${id}" hidden></div>
      `;
      container.appendChild(slot);
    });

    setupFileUpload();
  }

  function setupFileUpload() {
    document.querySelectorAll('.drop-zone').forEach(zone => {
      const docId = zone.dataset.docid;
      const input = zone.querySelector('.file-input') || document.getElementById(`file-${docId}`);

      // Click zone → trigger input
      zone.addEventListener('click', e => {
        if (e.target.tagName !== 'INPUT') input && input.click();
      });
      zone.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input && input.click(); }
      });

      // Drag events
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(docId, file, zone);
      });

      // Input change
      if (input) {
        input.addEventListener('change', e => {
          const file = e.target.files[0];
          if (file) handleFile(docId, file, zone);
        });
      }
    });
  }

  function handleFile(docId, file, zone) {
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!ALLOWED.includes(file.type)) {
      showToast('Only PDF, JPG, PNG files are allowed.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast('File size must not exceed 2 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      uploadedFiles[docId] = { name: file.name, size: file.size, type: file.type, dataUrl };
      updateDocSlotUI(docId, { name: file.name, size: file.size, type: file.type }, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function updateDocSlotUI(docId, meta, dataUrl) {
    const preview = document.getElementById(`preview-${docId}`);
    const status = document.getElementById(`doc-status-${docId}`);
    const zone = document.getElementById(`drop-zone-${docId}`);

    if (status) {
      status.className = 'doc-status doc-status-uploaded';
      status.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Uploaded
      `;
    }

    if (preview) {
      const isImage = meta.type && meta.type.startsWith('image/');
      const sizeKB = meta.size ? (meta.size / 1024).toFixed(1) : '—';
      const typeIcon = meta.type === 'application/pdf'
        ? `<svg class="file-type-icon pdf-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
        : `<svg class="file-type-icon img-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

      preview.innerHTML = `
        <div class="file-preview-card">
          ${(isImage && dataUrl) ? `<img src="${dataUrl}" alt="Preview" class="file-thumb" />` : typeIcon}
          <div class="file-meta">
            <span class="file-name" title="${escapeHtml(meta.name)}">${escapeHtml(truncate(meta.name, 32))}</span>
            <span class="file-size">${sizeKB} KB</span>
          </div>
          <button type="button" class="btn-remove-file" aria-label="Remove file" data-docid="${docId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      preview.hidden = false;

      // Remove button
      const removeBtn = preview.querySelector('.btn-remove-file');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => removeFile(docId));
      }
    }

    if (zone) zone.classList.add('has-file');
  }

  function removeFile(docId) {
    delete uploadedFiles[docId];
    const preview = document.getElementById(`preview-${docId}`);
    const status = document.getElementById(`doc-status-${docId}`);
    const zone = document.getElementById(`drop-zone-${docId}`);
    const input = document.getElementById(`file-${docId}`);

    if (preview) { preview.innerHTML = ''; preview.hidden = true; }
    if (status) {
      status.className = 'doc-status doc-status-pending';
      status.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Not Uploaded
      `;
    }
    if (zone) zone.classList.remove('has-file');
    if (input) input.value = '';
  }

  /* ─────────────────────── BANK VALIDATION ───────────────────── */
  function setupBankValidation() {
    const ifscInput = document.getElementById('bank-ifsc');
    if (!ifscInput) return;

    ifscInput.addEventListener('input', () => {
      const val = ifscInput.value.trim().toUpperCase();
      ifscInput.value = val;
      const helperEl = document.getElementById('ifsc-helper');
      if (!helperEl) return;

      if (val.length === 0) {
        helperEl.textContent = 'Format: ABCD0123456 (11 characters)';
        helperEl.className = 'field-hint';
      } else if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val)) {
        helperEl.textContent = '✓ Valid IFSC format';
        helperEl.className = 'field-hint hint-valid';
      } else {
        helperEl.textContent = '✗ Invalid — must be 11 chars: 4 letters, 0, 6 alphanumeric';
        helperEl.className = 'field-hint hint-invalid';
      }
    });
  }

  /* ─────────────────────── REVIEW SUMMARY ────────────────────── */
  function renderReviewSummary() {
    collectStepData(currentStep);
    const container = document.getElementById('review-summary');
    if (!container) return;

    const p = formData.personal || {};
    const a = formData.address || {};
    const b = formData.bank || {};
    const essay = formData.essay || '';
    const docs = formData.documents || uploadedFiles;

    const rows = [
      ['Full Name', p.name], ['Email', p.email], ['Phone', p.phone],
      ['Date of Birth', p.dob], ['Course', p.course], ['Year of Study', p.year],
      ['Institution', p.institution], ['CGPA', p.cgpa],
      ['Category', p.category], ['Annual Income', p.income ? '₹' + Number(p.income).toLocaleString('en-IN') : '—'],
      ['Address', [a.street, a.city, a.pin].filter(Boolean).join(', ')],
      ['Alternate Phone', a.altPhone || '—'],
      ['Bank Name', b.name], ['Account Number', b.account ? maskAccount(b.account) : '—'],
      ['IFSC Code', b.ifsc], ['Account Holder', b.holder],
    ];

    const docList = currentScholarship && currentScholarship.documentsRequired
      ? currentScholarship.documentsRequired
      : ['Aadhaar Card', 'Income Certificate', 'Marksheet', 'Bonafide Certificate'];

    const docRows = docList.map(d => {
      const id = slugify(d);
      const uploaded = docs[id];
      return `<tr>
        <td>${escapeHtml(d)}</td>
        <td>${uploaded
          ? `<span class="badge badge-success">✓ Uploaded${uploaded.name ? ' — ' + escapeHtml(truncate(uploaded.name, 24)) : ''}</span>`
          : `<span class="badge badge-danger">✗ Not Uploaded</span>`
        }</td>
      </tr>`;
    }).join('');

    const wordCount = essay.trim() === '' ? 0 : essay.trim().split(/\s+/).length;
    const essayPreview = essay.length > 300
      ? `${escapeHtml(essay.substring(0, 300))}…`
      : escapeHtml(essay);

    container.innerHTML = `
      <section class="review-section">
        <h3 class="review-section-title">Personal & Academic Details</h3>
        <table class="review-table">
          <tbody>
            ${rows.map(([label, value]) => `
              <tr>
                <th>${escapeHtml(label)}</th>
                <td>${escapeHtml(String(value || '—'))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="review-section">
        <h3 class="review-section-title">Documents</h3>
        <table class="review-table">
          <tbody>${docRows}</tbody>
        </table>
      </section>

      <section class="review-section">
        <h3 class="review-section-title">Personal Statement</h3>
        <div class="essay-review-preview">
          <p>${essayPreview}</p>
          ${essay.length > 300 ? `<button type="button" class="btn-link" id="btn-expand-essay">Read more</button>` : ''}
        </div>
        <p class="review-meta">${wordCount} words · ${essay.length} characters</p>
      </section>

      <section class="review-section">
        <h3 class="review-section-title">Scholarship Details</h3>
        <table class="review-table">
          <tbody>
            <tr><th>Scholarship</th><td>${escapeHtml(currentScholarship ? currentScholarship.name : 'N/A')}</td></tr>
            <tr><th>Amount</th><td>${currentScholarship ? '₹' + Number(currentScholarship.amount || 0).toLocaleString('en-IN') : '—'}</td></tr>
            <tr><th>Deadline</th><td>${currentScholarship ? new Date(currentScholarship.deadline).toLocaleDateString('en-IN') : '—'}</td></tr>
          </tbody>
        </table>
      </section>
    `;

    // Expand essay
    const expandBtn = document.getElementById('btn-expand-essay');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const p = expandBtn.previousElementSibling;
        if (p) p.textContent = essay;
        expandBtn.remove();
      });
    }
  }

  /* ─────────────────────── SUBMIT ────────────────────────────── */
  function setupDeclarationCheckbox() {
    const decl = document.getElementById('declaration-check');
    const submitBtn = document.getElementById('btn-next');
    if (!decl || !submitBtn) return;
    decl.addEventListener('change', () => {
      if (currentStep === 4) {
        submitBtn.disabled = !decl.checked;
      }
    });
  }

  function handleSubmit() {
    collectStepData(currentStep);
    const result = validateStep(4);
    if (!result.valid) {
      showValidationErrors(result.errors);
      return;
    }
    submitApplication();
  }

  function submitApplication() {
    if (!currentUser) return;
    const appId = generateAppId();
    const application = {
      id: appId,
      scholarshipId: currentScholarship ? currentScholarship.id : null,
      scholarshipName: currentScholarship ? currentScholarship.name : 'Unknown',
      scholarshipAmount: currentScholarship ? currentScholarship.amount : 0,
      userId: currentUser.id,
      applicantName: (formData.personal || {}).name || currentUser.name,
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
      formData: { ...formData },
      uploadedDocs: Object.keys(uploadedFiles),
    };

    // Save to storage
    Storage.saveApplication(application);

    // Add notification
    Storage.addNotification({
      userId: currentUser.id,
      type: 'application_submitted',
      title: 'Application Submitted',
      message: `Your application for "${application.scholarshipName}" has been submitted successfully. Application ID: ${appId}`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Clear draft
    const scholarshipId = currentScholarship ? currentScholarship.id : 'generic';
    localStorage.removeItem(`sp_draft_${currentUser.id}_${scholarshipId}`);

    // Clear auto-save interval
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    if (deadlineTimer) clearInterval(deadlineTimer);

    // Show success screen
    showSuccessScreen(appId, application.scholarshipName, application.scholarshipAmount);
  }

  function showSuccessScreen(appId, scholarshipName, amount) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
      const p = document.getElementById(`step-${i}`);
      if (p) p.hidden = true;
    }
    const formProgress = document.querySelector('.form-progress');
    if (formProgress) formProgress.hidden = true;
    const formNav = document.querySelector('.form-nav');
    if (formNav) formNav.hidden = true;

    const successScreen = document.getElementById('success-screen');
    if (!successScreen) return;
    successScreen.hidden = false;

    const appIdEl = document.getElementById('success-app-id');
    if (appIdEl) appIdEl.textContent = appId;

    const amountEl = document.getElementById('success-amount');
    if (amountEl && amount) amountEl.textContent = '₹' + Number(amount).toLocaleString('en-IN');

    const printBtn = document.getElementById('btn-print-receipt');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  /* ─────────────────────── HELPERS ───────────────────────────── */
  function generateAppId() {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(10000 + Math.random() * 90000));
    return `APP-${year}-${rand}`;
  }

  function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  function maskAccount(acc) {
    if (acc.length <= 4) return acc;
    return '•'.repeat(acc.length - 4) + acc.slice(-4);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.className = 'toast-container';
    div.setAttribute('aria-live', 'polite');
    document.body.appendChild(div);
    return div;
  }

  function updateTheme() {
    const html = document.documentElement;
    const saved = localStorage.getItem('sp_theme') || 'light';
    html.setAttribute('data-theme', saved);
  }

  /* ─────────────────────── PUBLIC API ────────────────────────── */
  return {
    init,
    goToStep,
    nextStep,
    prevStep,
    validateStep,
    collectStepData,
    saveDraft,
    loadDraft,
    generateAppId,
    submitApplication,
    renderReviewSummary,
  };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ApplyModule.init();
});
