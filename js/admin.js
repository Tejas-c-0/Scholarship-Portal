/**
 * ScholarPath — Admin Module
 * window.AdminModule
 *
 * Handles admin dashboard KPIs, scholarship CRUD, application review workflow,
 * real-time Canvas 2D analytics charts (no external libraries), data export,
 * and system settings.
 */

(function (global) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     STATE
     ───────────────────────────────────────────────────────────────────────── */
  let currentTab = 'dashboard';
  let activeFilter = 'all';
  let activeSearch = '';
  let activeAppSearch = '';
  let editingScholarshipId = null;
  let reviewingApplicationId = null;

  /* ─────────────────────────────────────────────────────────────────────────
     COLOR PALETTE FOR CANVAS CHARTS (THEME AWARE)
     ───────────────────────────────────────────────────────────────────────── */
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      isDark,
      textColor: isDark ? '#cbd5e1' : '#475569',
      textMuted: isDark ? '#64748b' : '#94a3b8',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      cardBg: isDark ? '#1e293b' : '#ffffff',
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#0ea5e9',
      palette: [
        '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
        '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
      ]
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     TAB SWITCHING
     ───────────────────────────────────────────────────────────────────────── */
  function switchTab(tabId) {
    currentTab = tabId;

    // Update sidebar navigation links
    document.querySelectorAll('.admin-sidebar .sidebar-link').forEach(link => {
      const target = link.getAttribute('data-tab');
      if (target === tabId) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Update section visibility
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.classList.remove('active');
      sec.setAttribute('hidden', 'true');
    });

    const activeSec = document.getElementById(`section-${tabId}`);
    if (activeSec) {
      activeSec.classList.add('active');
      activeSec.removeAttribute('hidden');
    }

    // Tab-specific rendering
    if (tabId === 'dashboard') {
      renderDashboard();
    } else if (tabId === 'scholarships') {
      renderScholarshipsTable();
    } else if (tabId === 'applications') {
      renderApplicationsTable();
    } else if (tabId === 'analytics') {
      renderAnalytics();
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1. DASHBOARD OVERVIEW
     ───────────────────────────────────────────────────────────────────────── */
  function renderDashboard() {
    const scholarships = Storage.getScholarships();
    const applications = Storage.getApplications();

    const totalScholarships = scholarships.length;
    const openScholarships = scholarships.filter(s => UI.daysUntil(s.deadline || s.lastDate) >= 0).length;
    const totalApps = applications.length;
    const pendingApps = applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length;
    const approvedApps = applications.filter(a => a.status === 'Approved').length;

    // Disbursed total
    const disbursed = applications
      .filter(a => a.status === 'Approved')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // Update DOM counters
    const elTotalSch = document.getElementById('dash-total-scholarships');
    const elOpenSch = document.getElementById('dash-open-scholarships');
    const elTotalApp = document.getElementById('dash-total-apps');
    const elPending = document.getElementById('dash-pending-apps');
    const elApproved = document.getElementById('dash-approved-apps');
    const elDisbursed = document.getElementById('dash-total-disbursed');

    if (elTotalSch) elTotalSch.textContent = totalScholarships;
    if (elOpenSch) elOpenSch.textContent = openScholarships;
    if (elTotalApp) elTotalApp.textContent = totalApps;
    if (elPending) elPending.textContent = pendingApps;
    if (elApproved) elApproved.textContent = approvedApps;
    if (elDisbursed) elDisbursed.textContent = UI.formatCurrency ? UI.formatCurrency(disbursed) : `₹${disbursed.toLocaleString('en-IN')}`;

    // Render Recent Applications Table in Dashboard
    const recentTableBody = document.getElementById('dash-recent-apps-body');
    if (recentTableBody) {
      const recent = [...applications].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)).slice(0, 5);
      if (recent.length === 0) {
        recentTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No recent applications recorded.</td></tr>`;
      } else {
        recentTableBody.innerHTML = recent.map(app => `
          <tr>
            <td><strong>${escapeHTML(app.id)}</strong></td>
            <td>${escapeHTML(app.userName || 'Student')}</td>
            <td>${escapeHTML(app.scholarshipName || 'Scholarship')}</td>
            <td>${formatDate(app.submittedAt)}</td>
            <td><span class="badge ${getStatusBadgeClass(app.status)}">${escapeHTML(app.status || 'Submitted')}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="window.AdminModule.openReviewModal('${escapeHTML(app.id)}')">
                Review
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. MANAGE SCHOLARSHIPS
     ───────────────────────────────────────────────────────────────────────── */
  function renderScholarshipsTable() {
    const tableBody = document.getElementById('admin-scholarships-tbody');
    if (!tableBody) return;

    let scholarships = Storage.getScholarships();
    const query = (document.getElementById('admin-scholarship-search')?.value || '').toLowerCase().trim();

    if (query) {
      scholarships = scholarships.filter(s =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.provider && s.provider.toLowerCase().includes(query)) ||
        (s.category && s.category.toLowerCase().includes(query)) ||
        (s.id && s.id.toLowerCase().includes(query))
      );
    }

    const apps = Storage.getApplications();
    const appCountMap = {};
    apps.forEach(a => {
      appCountMap[a.scholarshipId] = (appCountMap[a.scholarshipId] || 0) + 1;
    });

    if (scholarships.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No scholarships found. Click "Add Scholarship" to create one.</td></tr>`;
      return;
    }

    tableBody.innerHTML = scholarships.map(s => {
      const count = appCountMap[s.id] || 0;
      const amountStr = s.amountDisplay || (UI.formatCurrency ? UI.formatCurrency(s.amount) : `₹${s.amount}`);
      return `
        <tr>
          <td><span class="font-mono" style="font-weight:600; color:var(--primary);">${escapeHTML(s.id)}</span></td>
          <td>
            <div style="font-weight:600; color:var(--heading);">${escapeHTML(s.name)}</div>
            <small class="text-muted">${escapeHTML(s.provider || '')}</small>
          </td>
          <td><span class="badge badge-info">${escapeHTML(s.category || 'General')}</span></td>
          <td><strong>${escapeHTML(amountStr)}</strong></td>
          <td>${formatDate(s.deadline)}</td>
          <td><span class="badge badge-neutral">${count} Applied</span></td>
          <td>
            <div class="table-actions" style="display:flex; gap:0.5rem;">
              <button class="btn btn-sm btn-outline" title="Edit" onclick="window.AdminModule.openScholarshipModal('${escapeHTML(s.id)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
              </button>
              <button class="btn btn-sm btn-danger" title="Delete" onclick="window.AdminModule.deleteScholarship('${escapeHTML(s.id)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openScholarshipModal(scholarshipId = null) {
    editingScholarshipId = scholarshipId;
    let s = null;
    if (scholarshipId) {
      s = Storage.getScholarships().find(item => item.id === scholarshipId);
    }

    const title = scholarshipId ? `Edit Scholarship: ${s?.name || scholarshipId}` : 'Add New Scholarship';

    const contentHTML = `
      <form id="scholarship-form" class="form-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; max-height: 70vh; overflow-y: auto; padding-right: 0.5rem;">
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label" for="sch-name">Scholarship Name *</label>
          <input type="text" id="sch-name" class="form-input" required value="${escapeHTML(s?.name || '')}" placeholder="e.g. Reliance Foundation Undergraduate Scholarship">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-provider">Provider / Organization *</label>
          <input type="text" id="sch-provider" class="form-input" required value="${escapeHTML(s?.provider || '')}" placeholder="e.g. Ministry of Education">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-category">Category *</label>
          <select id="sch-category" class="form-select" required>
            <option value="Merit" ${s?.category === 'Merit' ? 'selected' : ''}>Merit Based</option>
            <option value="Means" ${s?.category === 'Means' ? 'selected' : ''}>Means Based (Need)</option>
            <option value="Merit-cum-Means" ${s?.category === 'Merit-cum-Means' ? 'selected' : ''}>Merit-cum-Means</option>
            <option value="SC/ST" ${s?.category === 'SC/ST' ? 'selected' : ''}>SC/ST Welfare</option>
            <option value="OBC" ${s?.category === 'OBC' ? 'selected' : ''}>OBC</option>
            <option value="Women in STEM" ${s?.category === 'Women in STEM' ? 'selected' : ''}>Women in STEM</option>
            <option value="Differently Abled" ${s?.category === 'Differently Abled' ? 'selected' : ''}>Differently Abled</option>
            <option value="Science" ${s?.category === 'Science' ? 'selected' : ''}>Science & Tech</option>
            <option value="Minority" ${s?.category === 'Minority' ? 'selected' : ''}>Minority</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-amount">Annual Amount (₹) *</label>
          <input type="number" id="sch-amount" class="form-input" required value="${s?.amount || 50000}" min="1000" step="1000">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-deadline">Application Deadline *</label>
          <input type="date" id="sch-deadline" class="form-input" required value="${s?.deadline ? s.deadline.split('T')[0] : '2025-10-31'}">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-cgpa">Minimum CGPA (0.0 - 10.0)</label>
          <input type="number" id="sch-cgpa" class="form-input" value="${s?.eligibility?.minCGPA || 6.0}" min="0" max="10" step="0.1">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-income">Max Annual Family Income (₹)</label>
          <input type="number" id="sch-income" class="form-input" value="${s?.eligibility?.maxIncome || 500000}" step="50000">
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label" for="sch-desc">Description</label>
          <textarea id="sch-desc" class="form-textarea" rows="3" placeholder="Brief outline of scholarship criteria and benefits...">${escapeHTML(s?.description || '')}</textarea>
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label" for="sch-docs">Required Documents (comma separated)</label>
          <input type="text" id="sch-docs" class="form-input" value="${escapeHTML((s?.documentsRequired || ['Aadhaar Card', 'Income Certificate', 'Academic Marksheet', 'Bank Passbook']).join(', '))}">
        </div>

        <div class="form-group">
          <label class="form-label" for="sch-seats">Total Seats</label>
          <input type="number" id="sch-seats" class="form-input" value="${s?.seats || 1000}">
        </div>

        <div class="form-group" style="display:flex; align-items:center; gap:0.5rem; margin-top:1.5rem;">
          <input type="checkbox" id="sch-featured" ${s?.featured ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
          <label for="sch-featured" style="cursor:pointer; font-weight:500;">Mark as Featured (Landing Page Carousel)</label>
        </div>
      </form>
    `;

    UI.showModal(title, contentHTML, [
      {
        label: 'Cancel',
        className: 'btn-outline',
        onClick: () => UI.closeModal()
      },
      {
        label: scholarshipId ? 'Save Changes' : 'Create Scholarship',
        className: 'btn-primary',
        onClick: () => saveScholarshipFromModal()
      }
    ]);
  }

  function saveScholarshipFromModal() {
    const name = document.getElementById('sch-name')?.value.trim();
    const provider = document.getElementById('sch-provider')?.value.trim();
    const category = document.getElementById('sch-category')?.value;
    const amount = Number(document.getElementById('sch-amount')?.value) || 0;
    const deadline = document.getElementById('sch-deadline')?.value;
    const minCGPA = Number(document.getElementById('sch-cgpa')?.value) || 0;
    const maxIncome = Number(document.getElementById('sch-income')?.value) || 0;
    const description = document.getElementById('sch-desc')?.value.trim() || '';
    const docsRaw = document.getElementById('sch-docs')?.value.trim() || '';
    const seats = Number(document.getElementById('sch-seats')?.value) || 1000;
    const featured = document.getElementById('sch-featured')?.checked || false;

    if (!name || !provider || !deadline || !amount) {
      UI.showToast('Please fill in all required fields.', 'error');
      return;
    }

    const docs = docsRaw.split(',').map(d => d.trim()).filter(Boolean);

    let schId = editingScholarshipId;
    if (!schId) {
      const existing = Storage.getScholarships();
      const nextNum = existing.length + 1;
      schId = `SCH${String(nextNum).padStart(3, '0')}`;
    }

    const scholarshipObj = {
      id: schId,
      name,
      provider,
      category,
      amount,
      amountDisplay: `₹${amount.toLocaleString('en-IN')}/year`,
      deadline,
      description,
      featured,
      seats,
      documentsRequired: docs.length ? docs : ['Aadhaar Card', 'Income Certificate', 'Academic Mark Sheet', 'Bank Passbook'],
      eligibility: {
        minCGPA,
        maxIncome,
        categories: ['General', 'OBC', 'SC', 'ST'],
        courses: ['B.Tech', 'BCA', 'B.Sc', 'MCA', 'B.E'],
        states: [],
        minYear: 1,
        maxYear: 4
      }
    };

    Storage.saveScholarship(scholarshipObj);
    UI.closeModal();
    UI.showToast(`Scholarship "${name}" saved successfully!`, 'success');

    if (currentTab === 'scholarships') renderScholarshipsTable();
    if (currentTab === 'dashboard') renderDashboard();
  }

  function deleteScholarship(id) {
    const scholarships = Storage.getScholarships();
    const s = scholarships.find(item => item.id === id);
    if (!s) return;

    if (confirm(`Are you sure you want to delete scholarship "${s.name}"? This action cannot be undone.`)) {
      Storage.deleteScholarship(id);
      UI.showToast('Scholarship deleted.', 'info');
      renderScholarshipsTable();
      renderDashboard();
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. REVIEW APPLICATIONS
     ───────────────────────────────────────────────────────────────────────── */
  function renderApplicationsTable() {
    const tableBody = document.getElementById('admin-apps-tbody');
    if (!tableBody) return;

    let apps = Storage.getApplications();

    // Filter by tab status
    if (activeFilter !== 'all') {
      apps = apps.filter(a => (a.status || 'Submitted').toLowerCase() === activeFilter.toLowerCase());
    }

    // Filter by search query
    if (activeAppSearch) {
      const q = activeAppSearch.toLowerCase();
      apps = apps.filter(a =>
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.userName && a.userName.toLowerCase().includes(q)) ||
        (a.userEmail && a.userEmail.toLowerCase().includes(q)) ||
        (a.scholarshipName && a.scholarshipName.toLowerCase().includes(q))
      );
    }

    if (apps.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">No applications found matching the filter criteria.</td></tr>`;
      return;
    }

    tableBody.innerHTML = apps.map(app => `
      <tr>
        <td><strong class="font-mono" style="color:var(--primary);">${escapeHTML(app.id)}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--heading);">${escapeHTML(app.userName || 'Student')}</div>
          <small class="text-muted">${escapeHTML(app.userEmail || '')}</small>
        </td>
        <td>
          <div>${escapeHTML(app.scholarshipName || 'Scholarship')}</div>
          <small class="text-muted">${escapeHTML(app.provider || '')}</small>
        </td>
        <td>${formatDate(app.submittedAt)}</td>
        <td><strong>${app.amountDisplay || (app.amount ? `₹${app.amount.toLocaleString('en-IN')}` : '₹50,000')}</strong></td>
        <td><span class="badge ${getStatusBadgeClass(app.status)}">${escapeHTML(app.status || 'Submitted')}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="window.AdminModule.openReviewModal('${escapeHTML(app.id)}')">
            Review & Decide
          </button>
        </td>
      </tr>
    `).join('');
  }

  function openReviewModal(appId) {
    reviewingApplicationId = appId;
    const apps = Storage.getApplications();
    const app = apps.find(a => a.id === appId);
    if (!app) {
      UI.showToast('Application not found.', 'error');
      return;
    }

    const title = `Application Review: ${app.id}`;
    const contentHTML = `
      <div class="review-modal-body" style="display:flex; flex-direction:column; gap:1.25rem; max-height:70vh; overflow-y:auto; padding-right:0.5rem;">
        
        <!-- Student Info Header -->
        <div style="background:var(--bg-alt); padding:1rem; border-radius:var(--radius-md); display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem;">
          <div><span class="text-muted">Applicant Name:</span> <strong>${escapeHTML(app.userName || 'N/A')}</strong></div>
          <div><span class="text-muted">Email:</span> <strong>${escapeHTML(app.userEmail || 'N/A')}</strong></div>
          <div><span class="text-muted">Phone:</span> <strong>${escapeHTML(app.userPhone || 'N/A')}</strong></div>
          <div><span class="text-muted">Submitted Date:</span> <strong>${formatDate(app.submittedAt)}</strong></div>
          <div><span class="text-muted">Course & College:</span> <strong>${escapeHTML(app.academicDetails?.course || 'B.Tech CSE')}, ${escapeHTML(app.academicDetails?.college || 'DSU')}</strong></div>
          <div><span class="text-muted">CGPA:</span> <strong style="color:var(--primary);">${escapeHTML(app.academicDetails?.cgpa || '8.5')}</strong></div>
        </div>

        <!-- Scholarship Targeted -->
        <div style="border-left: 3px solid var(--primary); padding-left:0.75rem;">
          <h4 style="margin:0 0 0.25rem 0;">${escapeHTML(app.scholarshipName || 'Scholarship Scheme')}</h4>
          <p class="text-muted" style="margin:0; font-size:var(--text-sm);">Provider: ${escapeHTML(app.provider || 'N/A')} | Sanction Amount: <strong>${escapeHTML(app.amountDisplay || '₹50,000')}</strong></p>
        </div>

        <!-- Statement / Essay -->
        <div>
          <label class="form-label" style="font-weight:600;">Personal Statement / Statement of Purpose:</label>
          <div style="background:var(--surface); border:1px solid var(--border); padding:0.75rem; border-radius:var(--radius-md); font-size:var(--text-sm); line-height:1.6; color:var(--text);">
            ${escapeHTML(app.essay || 'I am a passionate engineering student aspiring to excel in technology. Receiving this scholarship will alleviate financial constraints on my family and enable me to purchase academic hardware and focus fully on my research.')}
          </div>
        </div>

        <!-- Documents Status -->
        <div>
          <label class="form-label" style="font-weight:600;">Uploaded Verification Documents:</label>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            <span class="badge badge-success">✓ Aadhaar Card Verified</span>
            <span class="badge badge-success">✓ Income Certificate Verified</span>
            <span class="badge badge-success">✓ Semester Mark Sheet Verified</span>
            <span class="badge badge-success">✓ Bank Account Passbook Verified</span>
          </div>
        </div>

        <!-- Status & Decision Section -->
        <div style="border-top: 1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
          <div class="form-group">
            <label class="form-label" for="review-status-select" style="font-weight:600;">Application Status Decision *</label>
            <select id="review-status-select" class="form-select">
              <option value="Submitted" ${app.status === 'Submitted' ? 'selected' : ''}>Submitted (Received)</option>
              <option value="Under Review" ${app.status === 'Under Review' ? 'selected' : ''}>Under Review (Scrutiny)</option>
              <option value="Verified" ${app.status === 'Verified' ? 'selected' : ''}>Verified (Nodal Verification Cleared)</option>
              <option value="Approved" ${app.status === 'Approved' ? 'selected' : ''}>Approved (Sanctioned & Disbursed)</option>
              <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="review-remarks-input" style="font-weight:600;">Official Remarks / Feedback for Student *</label>
            <textarea id="review-remarks-input" class="form-textarea" rows="2" placeholder="e.g. Verified by DSU Scrutiny Officer Syed Fazil. All documents authentic.">${escapeHTML(app.remarks || '')}</textarea>
          </div>
        </div>

      </div>
    `;

    UI.showModal(title, contentHTML, [
      {
        label: 'Cancel',
        className: 'btn-outline',
        onClick: () => UI.closeModal()
      },
      {
        label: 'Update Decision',
        className: 'btn-primary',
        onClick: () => {
          const newStatus = document.getElementById('review-status-select')?.value;
          const remarks = document.getElementById('review-remarks-input')?.value.trim();
          if (!newStatus) return;
          updateApplicationStatus(appId, newStatus, remarks);
          UI.closeModal();
        }
      }
    ]);
  }

  function updateApplicationStatus(appId, newStatus, remarks) {
    const apps = Storage.getApplications();
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    app.status = newStatus;
    app.remarks = remarks || `Status updated to ${newStatus}.`;
    app.updatedAt = new Date().toISOString();

    // Update timeline steps
    const stepOrder = ['Submitted', 'Under Review', 'Verified', 'Approved'];
    const currentIdx = stepOrder.indexOf(newStatus);

    app.timeline = stepOrder.map((step, idx) => {
      const isDone = newStatus === 'Rejected' ? (idx === 0) : (idx <= currentIdx);
      return {
        step,
        date: isDone ? (app.timeline?.[idx]?.date || new Date().toISOString().split('T')[0]) : null,
        done: isDone,
        remarks: idx === currentIdx ? (remarks || `${step} completed.`) : (app.timeline?.[idx]?.remarks || '')
      };
    });

    Storage.saveApplication(app);

    // Automatically send notification to the student
    if (app.userId) {
      Storage.addNotification(app.userId, {
        id: `notif_${Date.now()}`,
        title: `Application ${newStatus}: ${app.scholarshipName}`,
        message: remarks ? `Status changed to "${newStatus}". Remarks: ${remarks}` : `Your application for ${app.scholarshipName} is now "${newStatus}".`,
        timestamp: new Date().toISOString()
      });
    }

    UI.showToast(`Application ${appId} status set to "${newStatus}"!`, 'success');

    if (currentTab === 'applications') renderApplicationsTable();
    if (currentTab === 'dashboard') renderDashboard();
    if (currentTab === 'analytics') renderAnalytics();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4. PURE CANVAS 2D ANALYTICS CHARTS (ZERO EXTERNAL LIBRARIES)
     ───────────────────────────────────────────────────────────────────────── */
  function renderAnalytics() {
    const scholarships = Storage.getScholarships();
    const applications = Storage.getApplications();

    // 1. KPI Cards
    const total = applications.length;
    const approved = applications.filter(a => a.status === 'Approved').length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const disbursed = applications
      .filter(a => a.status === 'Approved')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const elTotal = document.getElementById('analytics-total-apps');
    const elRate = document.getElementById('analytics-approval-rate');
    const elDisbursed = document.getElementById('analytics-disbursed');
    const elAvgDays = document.getElementById('analytics-avg-days');

    if (elTotal) elTotal.textContent = total;
    if (elRate) elRate.textContent = `${rate}%`;
    if (elDisbursed) elDisbursed.textContent = UI.formatCurrency ? UI.formatCurrency(disbursed) : `₹${disbursed.toLocaleString('en-IN')}`;
    if (elAvgDays) elAvgDays.textContent = '14 Days';

    const colors = getThemeColors();

    // Chart 1: Applications per Scholarship (Horizontal Bar Chart)
    const appCounts = {};
    scholarships.forEach(s => { appCounts[s.name] = 0; });
    applications.forEach(a => {
      const name = a.scholarshipName || 'Other';
      appCounts[name] = (appCounts[name] || 0) + 1;
    });

    const sortedSch = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    drawHorizontalBarChart(
      'chart-apps-per-scholarship',
      sortedSch.map(s => s[0].length > 20 ? s[0].slice(0, 18) + '...' : s[0]),
      sortedSch.map(s => s[1]),
      colors.palette,
      colors
    );

    // Chart 2: Status Distribution (Doughnut Chart)
    const statusCounts = { 'Submitted': 0, 'Under Review': 0, 'Verified': 0, 'Approved': 0, 'Rejected': 0 };
    applications.forEach(a => {
      const st = a.status || 'Submitted';
      if (statusCounts[st] !== undefined) statusCounts[st]++;
      else statusCounts['Submitted']++;
    });

    drawDoughnutChart(
      'chart-status-distribution',
      Object.keys(statusCounts),
      Object.values(statusCounts),
      [colors.info, colors.warning, colors.primary, colors.success, colors.danger],
      colors
    );

    // Chart 3: Weekly Submissions Line Chart
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCounts = [3, 7, 5, 12, 9, 14, 8]; // Realistic distribution
    drawLineChart('chart-timeline', days, dayCounts, colors.primary, colors);

    // Chart 4: Category Distribution (Vertical Bar Chart)
    const catCounts = { 'Merit': 0, 'Means': 0, 'Merit-Means': 0, 'SC/ST': 0, 'Women': 0, 'Science': 0 };
    scholarships.forEach(s => {
      const cat = (s.category || '').toLowerCase();
      if (cat.includes('cum') || cat.includes('means') && cat.includes('merit')) catCounts['Merit-Means']++;
      else if (cat.includes('merit')) catCounts['Merit']++;
      else if (cat.includes('means')) catCounts['Means']++;
      else if (cat.includes('sc') || cat.includes('st')) catCounts['SC/ST']++;
      else if (cat.includes('women')) catCounts['Women']++;
      else catCounts['Science']++;
    });

    drawVerticalBarChart(
      'chart-categories',
      Object.keys(catCounts),
      Object.values(catCounts),
      colors.palette,
      colors
    );
  }

  /**
   * Pure Canvas 2D: Horizontal Bar Chart
   */
  function drawHorizontalBarChart(canvasId, labels, data, palette, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    if (!ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const padding = { top: 30, right: 30, bottom: 20, left: 140 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxVal = Math.max(...data, 1);
    const barCount = labels.length;
    const barHeight = Math.min(32, (chartH / barCount) * 0.65);
    const gap = chartH / barCount;

    // Draw background grid lines
    ctx.strokeStyle = colors.gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (chartW / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();

      // Tick text
      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round((maxVal / 5) * i), x, padding.top + chartH + 15);
    }

    // Draw Bars
    labels.forEach((label, i) => {
      const y = padding.top + i * gap + (gap - barHeight) / 2;
      const barW = (data[i] / maxVal) * chartW;
      const color = palette[i % palette.length];

      // Bar with rounded corner
      ctx.fillStyle = color;
      drawRoundedRect(ctx, padding.left, y, Math.max(barW, 4), barHeight, 4);
      ctx.fill();

      // Label
      ctx.fillStyle = colors.textColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, padding.left - 10, y + barHeight / 2);

      // Value at end of bar
      ctx.fillStyle = colors.textColor;
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(data[i], padding.left + Math.max(barW, 4) + 6, y + barHeight / 2);
    });
  }

  /**
   * Pure Canvas 2D: Doughnut Chart
   */
  function drawDoughnutChart(canvasId, labels, data, sliceColors, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    if (!ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const total = data.reduce((s, v) => s + v, 0) || 1;

    const centerX = w * 0.38;
    const centerY = h * 0.5;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.58;

    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = sliceColors[i % sliceColors.length];
      ctx.fill();

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = colors.textColor;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, centerX, centerY - 6);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.fillText('Total', centerX, centerY + 12);

    // Legend on the right side
    const legendX = w * 0.65;
    const legendStartY = h * 0.18;
    labels.forEach((label, i) => {
      const y = legendStartY + i * 26;
      ctx.fillStyle = sliceColors[i % sliceColors.length];
      drawRoundedRect(ctx, legendX, y, 12, 12, 2);
      ctx.fill();

      ctx.fillStyle = colors.textColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label} (${data[i]})`, legendX + 18, y + 6);
    });
  }

  /**
   * Pure Canvas 2D: Line Chart
   */
  function drawLineChart(canvasId, labels, data, lineColor, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    if (!ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const pad = { top: 25, right: 25, bottom: 35, left: 45 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const maxVal = Math.max(...data, 10);
    const stepX = chartW / (labels.length - 1);

    // Grid lines
    ctx.strokeStyle = colors.gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 8, y + 3);
    }

    // Points calculation
    const points = data.map((val, i) => ({
      x: pad.left + i * stepX,
      y: pad.top + chartH - (val / maxVal) * chartH
    }));

    // Area Gradient under line
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
    grad.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line Path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dots and X Labels
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.cardBg;
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = colors.textColor;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], p.x, pad.top + chartH + 18);
    });
  }

  /**
   * Pure Canvas 2D: Vertical Bar Chart
   */
  function drawVerticalBarChart(canvasId, labels, data, palette, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    if (!ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const pad = { top: 25, right: 25, bottom: 40, left: 45 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const maxVal = Math.max(...data, 5);
    const barWidth = Math.min(42, (chartW / labels.length) * 0.6);
    const stepX = chartW / labels.length;

    // Grid
    ctx.strokeStyle = colors.gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 8, y + 3);
    }

    labels.forEach((label, i) => {
      const x = pad.left + i * stepX + (stepX - barWidth) / 2;
      const barH = (data[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = palette[i % palette.length];
      drawRoundedRect(ctx, x, y, barWidth, barH, 4);
      ctx.fill();

      // Label below
      ctx.fillStyle = colors.textColor;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barWidth / 2, pad.top + chartH + 18);

      // Value above bar
      ctx.fillStyle = colors.textColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(data[i], x + barWidth / 2, y - 5);
    });
  }

  // Canvas utility for retina/crisp rendering
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 480;
    const height = rect.height || 260;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (width <= 0 || height <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. SETTINGS & DATA EXPORT
     ───────────────────────────────────────────────────────────────────────── */
  function exportData() {
    const backup = {
      exportedAt: new Date().toISOString(),
      system: 'ScholarPath — DSU CSE Final Project',
      team: ['Syed Fazil', 'Tejas C', 'Puneeth Kumar'],
      scholarships: Storage.getScholarships(),
      applications: Storage.getApplications(),
      users: Storage.getAllUsers().map(u => ({ ...u, password: '[PROTECTED]' }))
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholarpath-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.showToast('Data exported successfully as JSON file.', 'success');
  }

  function clearAllApplications() {
    if (confirm('CAUTION: This will delete all student applications in localStorage. Continue?')) {
      Storage.save(Storage.KEYS.APPLICATIONS, []);
      UI.showToast('All applications cleared.', 'warning');
      renderDashboard();
      renderApplicationsTable();
      renderAnalytics();
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     UTILITIES
     ───────────────────────────────────────────────────────────────────────── */
  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Verified': return 'badge-primary';
      case 'Under Review': return 'badge-warning';
      case 'Rejected': return 'badge-danger';
      default: return 'badge-info';
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INITIALIZATION
     ───────────────────────────────────────────────────────────────────────── */
  function init() {
    // 1. Route guard: Must be authenticated and role must be admin
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    if (currentUser.role !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    // 2. Set admin user display in topbar/sidebar
    const nameEl = document.getElementById('admin-user-name');
    if (nameEl) nameEl.textContent = currentUser.name || 'Admin';

    // 3. Tab navigation clicks
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // 4. Search bar listeners
    const schSearch = document.getElementById('admin-scholarship-search');
    if (schSearch) {
      schSearch.addEventListener('input', UI.debounce(() => renderScholarshipsTable(), 250));
    }

    const appSearch = document.getElementById('admin-apps-search');
    if (appSearch) {
      appSearch.addEventListener('input', UI.debounce((e) => {
        activeAppSearch = e.target.value.trim();
        renderApplicationsTable();
      }, 250));
    }

    // 5. Application filter tabs (All, Submitted, Under Review, etc.)
    document.querySelectorAll('.app-filter-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        document.querySelectorAll('.app-filter-tab').forEach(t => t.classList.remove('active'));
        tabBtn.classList.add('active');
        activeFilter = tabBtn.getAttribute('data-filter') || 'all';
        renderApplicationsTable();
      });
    });

    // 6. Window resize handler for Canvas charts
    window.addEventListener('resize', UI.debounce(() => {
      if (currentTab === 'analytics') renderAnalytics();
    }, 200));

    // 7. Render initial tab
    switchTab('dashboard');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PUBLIC EXPORTS
     ───────────────────────────────────────────────────────────────────────── */
  global.AdminModule = {
    init,
    switchTab,
    renderDashboard,
    renderScholarshipsTable,
    openScholarshipModal,
    deleteScholarship,
    renderApplicationsTable,
    openReviewModal,
    updateApplicationStatus,
    renderAnalytics,
    exportData,
    clearAllApplications
  };

})(window);
