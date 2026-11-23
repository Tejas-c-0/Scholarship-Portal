/**
 * ScholarPath – Scholarships Module
 * window.ScholarshipsModule
 *
 * Handles listing, filtering, sorting, search, bookmarks, modal,
 * pagination, and view-toggle for scholarships.html.
 */
(function (global) {
  'use strict';

  /* ─────────────────────────── Constants ─────────────────────────── */
  const PAGE_SIZE = 12;

  /* ─────────────────────────── State ─────────────────────────── */
  let _allScholarships  = [];   // raw data from Storage / Data
  let _filtered         = [];   // after filters + search
  let _currentPage      = 1;
  let _currentView      = 'grid'; // 'grid' | 'list'
  let _currentUser      = null;
  let _searchTimer      = null;

  const filterState = {
    query:      '',
    categories: [],           // string[]
    minCGPA:    0,
    maxIncome:  'any',        // '<1L'|'1-2.5L'|'2.5-5L'|'5-8L'|'any'
    courses:    [],
    deadline:   'any',        // 'week'|'month'|'3months'|'any'
    amount:     'any',        // '<10k'|'10-50k'|'50-100k'|'>100k'|'any'
    bookmarksOnly: false,
    sortBy:     'deadline',   // 'amount_asc'|'amount_desc'|'deadline'|'name'
  };

  /* ─────────────────────────── Helpers ─────────────────────────── */

  /**
   * Returns formatted countdown string from a deadline ISO date string.
   * @param {string} deadlineDate - ISO date string
   * @returns {string}
   */
  function countdownTimer(deadlineDate) {
    const deadline = new Date(deadlineDate);
    if (Number.isNaN(deadline.getTime())) return 'Deadline unavailable';
    const days = deadlineDays(deadlineDate);
    if (days < 0) return 'Expired';
    if (days === 0) return 'Closes today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  function deadlineDays(deadlineDate) {
    if (global.UI?.daysUntil) return global.UI.daysUntil(deadlineDate);
    const deadline = new Date(deadlineDate);
    if (Number.isNaN(deadline.getTime())) return -Infinity;
    const today = new Date();
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.round((deadline - today) / 86400000);
  }

  /**
   * Returns urgency CSS class based on days remaining.
   * @param {string} deadlineDate
   * @returns {string} 'urgent'|'warning'|'safe'|'expired'
   */
  function deadlineClass(deadlineDate) {
    const days = deadlineDays(deadlineDate);
    if (days < 0) return 'expired';
    if (days < 7)  return 'urgent';
    if (days < 30) return 'warning';
    return 'safe';
  }

  function officialApplyLink(scholarship) {
    const link = global.UI?.getOfficialApplyLink?.(scholarship) || '';
    try {
      const url = new URL(link);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  /**
   * Format amount as ₹X,XX,XXX or "Varies".
   * @param {number|string} amount
   * @returns {string}
   */
  function formatAmount(amount) {
    if (!amount || amount === 0) return 'Varies';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return '₹' + num.toLocaleString('en-IN');
  }

  /**
   * Colored initials avatar for provider.
   * @param {string} name
   * @returns {string} HTML string
   */
  function providerAvatar(name) {
    const colors = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
    const initials = (name || 'SP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const color   = colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length];
    return `<div class="provider-avatar" style="background:${color}" aria-hidden="true">${initials}</div>`;
  }

  /**
   * Category badge HTML.
   * @param {string} category
   * @returns {string}
   */
  function categoryBadge(category) {
    const map = {
      merit:           { label: 'Merit',           cls: 'badge-merit'    },
      'need-based':    { label: 'Need-Based',      cls: 'badge-need'     },
      'merit-cum-means':{ label: 'Merit-cum-Means', cls: 'badge-mcm'     },
      minority:        { label: 'Minority',         cls: 'badge-minority' },
      'sc-st':         { label: 'SC/ST',            cls: 'badge-minority' },
      sports:          { label: 'Sports',           cls: 'badge-sports'   },
      research:        { label: 'Research',         cls: 'badge-research' },
      science:         { label: 'Science',          cls: 'badge-research' },
      'science-excellence': { label: 'Science',     cls: 'badge-research' },
      means:           { label: 'Means',            cls: 'badge-need'     },
      'financial-need':{ label: 'Financial Need',   cls: 'badge-need'     },
    };
    const normalized = String(category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const info = map[normalized] || { label: category || 'Scholarship', cls: 'badge-default' };
    return `<span class="badge ${info.cls}">${info.label}</span>`;
  }

  /**
   * Match score badge HTML (only shown when user is logged in).
   * @param {number} score 0-100
   * @returns {string}
   */
  function matchBadge(score) {
    if (score === null || score === undefined) return '';
    const cls = score >= 80 ? 'match-high' : score >= 50 ? 'match-mid' : 'match-low';
    return `<span class="match-badge ${cls}" title="Match score">${score}% match</span>`;
  }

  /**
   * Bookmark icon SVG.
   * @param {boolean} bookmarked
   * @returns {string}
   */
  function bookmarkIcon(bookmarked) {
    return bookmarked
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M5 2a2 2 0 00-2 2v18l9-4.5L21 22V4a2 2 0 00-2-2H5z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M5 2a2 2 0 00-2 2v18l9-4.5L21 22V4a2 2 0 00-2-2H5z"/></svg>`;
  }

  /* ─────────────────────────── Render ─────────────────────────── */

  /**
   * Render a scholarship card or list row.
   * @param {object} scholarship
   * @param {object|null} student
   * @param {'grid'|'list'} viewMode
   * @returns {string} HTML string
   */
  function renderScholarshipCard(scholarship, student, viewMode = 'grid') {
    const score = student
      ? (global.UI?.calculateRecommendationScore?.(student, scholarship) ?? null)
      : null;
    const bookmarks = student
      ? (global.Storage?.getBookmarks?.(student.id) ?? [])
      : [];
    const isBookmarked = bookmarks.includes(scholarship.id);
    const countdown    = countdownTimer(scholarship.deadline);
    const dClass       = deadlineClass(scholarship.deadline);
    const userIdAttr   = student ? `data-user-id="${student.id}"` : '';
    const eligibility  = scholarship.eligibility && typeof scholarship.eligibility === 'object'
      ? scholarship.eligibility
      : {};
    const minCGPA      = scholarship.minCGPA ?? eligibility.minCGPA ?? 'N/A';
    const isExpired    = dClass === 'expired';
    const officialLink = officialApplyLink(scholarship);
    const applyAction  = isExpired
      ? '<button class="btn btn-primary btn-sm" disabled>Applications Closed</button>'
      : officialLink
        ? `<a href="${officialLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" aria-label="Apply on the official site for ${scholarship.name}">Apply Now ↗</a>`
        : `<a href="apply.html?id=${encodeURIComponent(scholarship.id)}" class="btn btn-primary btn-sm">Continue Application</a>`;

    if (viewMode === 'list') {
      return `
<article class="scholarship-list-row" role="listitem" data-id="${scholarship.id}">
  <div class="list-row-left">
    ${providerAvatar(scholarship.provider)}
    <div class="list-row-info">
      <h3 class="sch-name">${scholarship.name}</h3>
      <p class="sch-provider">${scholarship.provider}</p>
    </div>
  </div>
  <div class="list-row-meta">
    ${categoryBadge(scholarship.category)}
    <span class="amount-badge">${formatAmount(scholarship.amount)}</span>
    ${score !== null ? matchBadge(score) : ''}
  </div>
  <div class="list-row-deadline deadline-${dClass}">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    <span>${countdown}</span>
  </div>
  <div class="list-row-actions">
    <button class="btn-icon bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
            aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}"
            data-id="${scholarship.id}" ${userIdAttr}
            onclick="ScholarshipsModule.toggleBookmark('${scholarship.id}', '${student?.id ?? ''}')">
      ${bookmarkIcon(isBookmarked)}
    </button>
    <button class="btn btn-secondary btn-sm"
            onclick="ScholarshipsModule.openModal('${scholarship.id}')"
            aria-label="View details for ${scholarship.name}">
      Details
    </button>
    ${applyAction}
  </div>
</article>`;
    }

    // Grid card (default)
    return `
<article class="scholarship-card" role="listitem" data-id="${scholarship.id}">
  <div class="card-header-row">
    ${providerAvatar(scholarship.provider)}
    <button class="btn-icon bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
            aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}"
            data-id="${scholarship.id}" ${userIdAttr}
            onclick="ScholarshipsModule.toggleBookmark('${scholarship.id}', '${student?.id ?? ''}')">
      ${bookmarkIcon(isBookmarked)}
    </button>
  </div>
  <div class="card-badges">
    ${categoryBadge(scholarship.category)}
    ${score !== null ? matchBadge(score) : ''}
  </div>
  <h3 class="sch-name">${scholarship.name}</h3>
  <p class="sch-provider">${scholarship.provider}</p>
  <div class="card-details">
    <div class="detail-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      <strong>${formatAmount(scholarship.amount)}</strong>
    </div>
    <div class="detail-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>Min CGPA: ${minCGPA}</span>
    </div>
    <div class="detail-item deadline-${dClass}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>${countdown}</span>
    </div>
  </div>
  <div class="card-actions">
    <button class="btn btn-secondary btn-sm"
            onclick="ScholarshipsModule.openModal('${scholarship.id}')"
            aria-label="View details for ${scholarship.name}">
      View Details
    </button>
    ${applyAction}
  </div>
</article>`;
  }

  /**
   * Render scholarship detail modal content.
   * @param {object} scholarship
   * @returns {string} HTML string
   */
  function renderScholarshipModal(scholarship) {
    const countdown = countdownTimer(scholarship.deadline);
    const dClass    = deadlineClass(scholarship.deadline);
    const eligibility = scholarship.eligibility && typeof scholarship.eligibility === 'object'
      ? scholarship.eligibility
      : {};
    const deadlineDate = new Date(scholarship.deadline);
    const deadline = Number.isNaN(deadlineDate.getTime())
      ? 'Not provided'
      : deadlineDate.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        });

    const documents = scholarship.documentsRequired || scholarship.documents;
    const docList = Array.isArray(documents)
      ? documents.map(d => `<li>${d}</li>`).join('')
      : '<li>No documents listed</li>';

    const eligItems = Array.isArray(scholarship.eligibility)
      ? scholarship.eligibility
      : [
          eligibility.minCGPA > 0 ? `Minimum CGPA: ${eligibility.minCGPA}` : null,
          eligibility.maxIncome > 0 ? `Family income up to ₹${Number(eligibility.maxIncome).toLocaleString('en-IN')} per year` : null,
          eligibility.categories?.length ? `Eligible categories: ${eligibility.categories.join(', ')}` : null,
          eligibility.states?.length ? `Eligible states: ${eligibility.states.join(', ')}` : null,
        ].filter(Boolean);
    const eligList = eligItems.length
      ? eligItems.map(e => `<li>${e}</li>`).join('')
      : '<li>Refer to the official website for eligibility criteria</li>';

    const courses = scholarship.courses ?? eligibility.courses;
    const courseList = Array.isArray(courses)
      ? courses.length ? courses.join(', ') : 'All Courses'
      : courses || 'All Courses';
    const minCGPA = scholarship.minCGPA ?? eligibility.minCGPA ?? 'N/A';
    const maxIncome = scholarship.maxIncome ?? eligibility.maxIncome;
    const incomeLimit = Number(maxIncome) > 0
      ? '₹' + Number(maxIncome).toLocaleString('en-IN') + '/yr'
      : 'No limit';
    const officialLink = officialApplyLink(scholarship);

    return `
<div class="modal-sch-header">
  ${providerAvatar(scholarship.provider)}
  <div class="modal-sch-title">
    <h2 id="modal-title">${scholarship.name}</h2>
    <p class="modal-provider">${scholarship.provider}</p>
    <div class="modal-badges">
      ${categoryBadge(scholarship.category)}
      <span class="amount-badge amount-lg">${formatAmount(scholarship.amount)}</span>
    </div>
  </div>
</div>

<div class="modal-deadline deadline-${dClass}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  <strong>Deadline:</strong> ${deadline} &nbsp;
  <span class="countdown-pill deadline-${dClass}">${countdown}</span>
</div>

<div class="modal-body-grid">
  <section class="modal-section">
    <h3>Description</h3>
    <p>${scholarship.description || 'No description available.'}</p>
  </section>

  <section class="modal-section">
    <h3>Eligibility Criteria</h3>
    <ul class="modal-list">${eligList}</ul>
  </section>

  <section class="modal-section modal-section-row">
    <div>
      <h3>Academic Requirement</h3>
      <p>Minimum CGPA: <strong>${minCGPA}</strong></p>
      <p>Eligible Courses: <strong>${courseList}</strong></p>
    </div>
    <div>
      <h3>Financial Criteria</h3>
      <p>Max Family Income: <strong>${incomeLimit}</strong></p>
    </div>
  </section>

  <section class="modal-section">
    <h3>Documents Required</h3>
    <ul class="modal-list docs-list">${docList}</ul>
  </section>

  ${officialLink ? `
  <section class="modal-section">
    <h3>Official Scheme Website</h3>
    <a href="${officialLink}" target="_blank" rel="noopener noreferrer" class="external-link">
      ${officialLink}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  </section>` : ''}
</div>

<div class="modal-footer">
  <button class="btn btn-secondary" onclick="ScholarshipsModule.closeModal()">Close</button>
  ${dClass === 'expired'
    ? '<button class="btn btn-primary" disabled>Applications Closed</button>'
    : officialLink
      ? `<a href="${officialLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Apply on Official Site ↗</a>`
      : `<a href="apply.html?id=${encodeURIComponent(scholarship.id)}" class="btn btn-primary">Continue Application</a>`}
</div>`;
  }

  /* ─────────────────────────── Filtering & Sorting ─────────────────────────── */

  /**
   * Parse income band to max numeric value (annual, INR).
   * @param {string} band
   * @returns {number}
   */
  function incomeBandMax(band) {
    const map = {
      '<1L':     100000,
      '1-2.5L':  250000,
      '2.5-5L':  500000,
      '5-8L':    800000,
      'any':     Infinity,
    };
    return map[band] ?? Infinity;
  }

  function matchesAmountBand(amount, band) {
    if (band === '<10k') return amount < 10000;
    if (band === '10-50k') return amount >= 10000 && amount < 50000;
    if (band === '50-100k') return amount >= 50000 && amount <= 100000;
    if (band === '>100k') return amount > 100000;
    return true;
  }

  function maxDeadlineDays(filter) {
    if (filter === 'week') return 7;
    if (filter === 'month') return 30;
    if (filter === '3months') return 90;
    return Infinity;
  }

  /**
   * Filter scholarships array based on filterState and a search query.
   * @param {object[]} scholarships
   * @param {object} filters - filterState object
   * @param {string} searchQuery
   * @returns {object[]}
   */
  function applyFilters(scholarships, filters, searchQuery) {
    const q       = (searchQuery || '').toLowerCase().trim();
    const categories = Array.isArray(filters.categories) ? filters.categories : [];
    const courses = Array.isArray(filters.courses) ? filters.courses : [];
    const maxInc = incomeBandMax(filters.maxIncome);
    const maxDays = maxDeadlineDays(filters.deadline);
    const bookmarks = filters.bookmarksOnly && _currentUser
      ? global.Storage?.getBookmarks?.(_currentUser.id) ?? []
      : [];

    return scholarships.filter(sch => {
      if (filters.bookmarksOnly && (!_currentUser || !bookmarks.includes(sch.id))) return false;

      // Search
      if (q) {
        const eligibility = sch.eligibility && typeof sch.eligibility === 'object'
          ? sch.eligibility
          : {};
        const haystack = [
          sch.name, sch.provider, sch.description, sch.category,
          ...(Array.isArray(sch.tags) ? sch.tags : []),
          ...(Array.isArray(eligibility.categories) ? eligibility.categories : []),
          ...(Array.isArray(eligibility.courses) ? eligibility.courses : []),
          ...(Array.isArray(eligibility.states) ? eligibility.states : []),
        ]
          .join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        const searchTerms = q.split(/[^a-z0-9]+/).filter(Boolean);
        if (!searchTerms.every(term => haystack.some(word => word.startsWith(term)))) return false;
      }

      // Category
      if (categories.length > 0) {
        const category = String(sch.category || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const aliases = {
          means: ['means', 'financial need', 'need based'],
          science: ['science', 'science excellence', 'research'],
          minority: ['minority', 'sc st', 'sc', 'st'],
          state: ['state', 'state government', 'state govt'],
          women: ['women', 'women in stem', 'female'],
        };
        const matchesCategory = categories.some(selected => {
          const normalized = String(selected).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          return (aliases[normalized] || [normalized]).includes(category);
        });
        if (!matchesCategory) return false;
      }

      // Min CGPA
      const eligibility = sch.eligibility && typeof sch.eligibility === 'object'
        ? sch.eligibility
        : {};
      const minCGPA = Number(sch.minCGPA ?? eligibility.minCGPA) || 0;
      const studentCGPA = Number(filters.minCGPA) || 0;
      if (studentCGPA > 0 && minCGPA > studentCGPA) return false;

      // Max Income
      const rawMaxIncome = Number(sch.maxIncome ?? eligibility.maxIncome);
      const maxIncome = rawMaxIncome > 0 ? rawMaxIncome : Infinity;
      if (maxInc < Infinity && maxIncome > maxInc) return false;

      // Courses
      if (courses.length > 0) {
        const courseValue = sch.courses ?? eligibility.courses;
        const schCourses = Array.isArray(courseValue) ? courseValue : courseValue ? [courseValue] : [];
        const unrestricted = schCourses.some(course =>
          ['all', 'any', 'all courses'].includes(
            String(course).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
          )
        );
        if (schCourses.length > 0 && !unrestricted) {
          const hasMatch = courses.some(selected => {
            const wanted = String(selected).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const courseAliases = wanted === 'b tech' ? ['b tech', 'b e'] : [wanted];
            return schCourses.some(course => {
              const normalized = String(course).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
              return courseAliases.some(alias => normalized === alias || normalized.startsWith(`${alias} `));
            });
          });
          if (!hasMatch) return false;
        }
      }

      // Deadline
      if (maxDays < Infinity) {
        const daysRemaining = deadlineDays(sch.deadline);
        if (daysRemaining < 0 || daysRemaining > maxDays) return false;
      }

      // Amount
      const amt = Number(sch.amount) || 0;
      if (!matchesAmountBand(amt, filters.amount)) return false;

      return true;
    });
  }

  /**
   * Sort a scholarships array.
   * @param {object[]} scholarships
   * @param {string} sortBy - 'amount_asc'|'amount_desc'|'deadline'|'name'
   * @returns {object[]}
   */
  function applySorting(scholarships, sortBy) {
    const arr = [...scholarships];
    switch (sortBy) {
      case 'amount_asc':
        return arr.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
      case 'amount_desc':
        return arr.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'deadline':
      default:
        return arr.sort((a, b) => {
          const aDays = deadlineDays(a.deadline);
          const bDays = deadlineDays(b.deadline);
          const aExpired = aDays < 0;
          const bExpired = bDays < 0;
          if (aExpired !== bExpired) return aExpired ? 1 : -1;
          if (aExpired) return bDays - aDays;
          return aDays - bDays;
        });
    }
  }

  /* ─────────────────────────── Rendering Helpers ─────────────────────────── */

  function renderEmptyState() {
    return `
<div class="empty-state" role="status" aria-live="polite">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" class="empty-svg" aria-hidden="true" width="200" height="160">
    <rect width="200" height="160" fill="none"/>
    <circle cx="100" cy="65" r="45" fill="var(--color-surface-elevated,#f1f5f9)" stroke="var(--color-border,#e2e8f0)" stroke-width="2"/>
    <path d="M80 55 Q100 35 120 55 Q130 70 100 85 Q70 70 80 55Z" fill="var(--color-primary,#4f46e5)" opacity="0.15"/>
    <circle cx="100" cy="62" r="12" fill="var(--color-primary,#4f46e5)" opacity="0.3"/>
    <line x1="60" y1="110" x2="140" y2="110" stroke="var(--color-border,#e2e8f0)" stroke-width="2" stroke-linecap="round"/>
    <line x1="75" y1="120" x2="125" y2="120" stroke="var(--color-border,#e2e8f0)" stroke-width="2" stroke-linecap="round"/>
    <text x="100" y="148" text-anchor="middle" fill="var(--color-text-muted,#94a3b8)" font-size="11" font-family="system-ui,sans-serif">No scholarships found</text>
  </svg>
  <h3>No Results Found</h3>
  <p>Try adjusting your filters or search query.</p>
  <button class="btn btn-secondary" onclick="ScholarshipsModule.clearFilters()">Clear All Filters</button>
</div>`;
  }

  function getPageSlice(arr) {
    const start = (_currentPage - 1) * PAGE_SIZE;
    return arr.slice(0, start + PAGE_SIZE); // cumulative "load more" style
  }

  function renderGrid() {
    const container = document.getElementById('scholarships-container');
    const countEl   = document.getElementById('results-count');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!container) return;

    const sorted = applySorting(_filtered, filterState.sortBy);
    const slice  = getPageSlice(sorted);

    if (sorted.length === 0) {
      container.innerHTML = renderEmptyState();
      if (countEl) countEl.textContent = '0';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    if (countEl) countEl.textContent = sorted.length;

    container.innerHTML = slice
      .map(sch => renderScholarshipCard(sch, _currentUser, _currentView))
      .join('');

    if (loadMoreBtn) {
      loadMoreBtn.style.display = slice.length < sorted.length ? 'flex' : 'none';
      loadMoreBtn.textContent   = `Load More (${sorted.length - slice.length} remaining)`;
    }
  }

  /* ─────────────────────────── Event Handlers ─────────────────────────── */

  /**
   * Debounced search handler.
   * @param {string} query
   */
  function handleSearch(query) {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      applySearch(query);
    }, 300);
  }

  function applySearch(query) {
    filterState.query = query.trim();
    _currentPage = 1;
    _filtered = applyFilters(_allScholarships, filterState, filterState.query);
    renderGrid();
  }

  /**
   * Read all filter inputs and re-render.
   */
  function handleFilterChange() {
    // Categories
    const catChecks = document.querySelectorAll('.filter-category:checked');
    filterState.categories = Array.from(catChecks).map(el => el.value);

    // Min CGPA
    const cgpaEl = document.getElementById('filter-cgpa');
    filterState.minCGPA = cgpaEl ? parseFloat(cgpaEl.value) || 0 : 0;
    const cgpaLbl = document.getElementById('filter-cgpa-value');
    if (cgpaLbl && cgpaEl) cgpaLbl.textContent = cgpaEl.value;

    // Max Income
    const incEl = document.getElementById('filter-income');
    filterState.maxIncome = incEl ? incEl.value : 'any';

    // Courses (multi-select)
    const courseEl = document.getElementById('filter-courses');
    if (courseEl) {
      filterState.courses = Array.from(courseEl.selectedOptions).map(o => o.value).filter(Boolean);
    }

    // Deadline
    const dlEl = document.getElementById('filter-deadline');
    filterState.deadline = dlEl ? dlEl.value : 'any';

    // Amount
    const amtEl = document.getElementById('filter-amount');
    filterState.amount = amtEl ? amtEl.value : 'any';

    const bookmarksEl = document.getElementById('filter-bookmarks');
    filterState.bookmarksOnly = Boolean(bookmarksEl?.checked);

    _currentPage = 1;
    _filtered = applyFilters(_allScholarships, filterState, filterState.query);
    renderGrid();
  }

  /**
   * Change sort and re-render.
   * @param {string} sortBy
   */
  function handleSortChange(sortBy) {
    filterState.sortBy = sortBy;
    renderGrid();
  }

  /**
   * Toggle grid/list view.
   * @param {'grid'|'list'} mode
   */
  function toggleView(mode) {
    _currentView = mode;
    const container = document.getElementById('scholarships-container');
    if (!container) return;
    container.className = mode === 'list' ? 'scholarships-list' : 'scholarships-grid';

    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });

    renderGrid();
  }

  /**
   * Toggle bookmark for a scholarship.
   * @param {string} scholarshipId
   * @param {string} userId
   */
  function toggleBookmark(scholarshipId, userId) {
    if (!userId) {
      // Not logged in — redirect to login
      window.location.href = 'index.html?redirect=scholarships.html';
      return;
    }
    const isNowBookmarked = global.Storage?.toggleBookmark?.(userId, scholarshipId);

    // Update all bookmark buttons with this scholarship ID
    document.querySelectorAll(`.bookmark-btn[data-id="${scholarshipId}"]`).forEach(btn => {
      btn.classList.toggle('bookmarked', isNowBookmarked);
      btn.setAttribute('aria-label', isNowBookmarked ? 'Remove bookmark' : 'Bookmark scholarship');
      btn.innerHTML = bookmarkIcon(isNowBookmarked);
    });
    if (filterState.bookmarksOnly) {
      _currentPage = 1;
      _filtered = applyFilters(_allScholarships, filterState, filterState.query);
      renderGrid();
    }
  }

  /**
   * Load next page (cumulative load more).
   */
  function loadMore() {
    _currentPage++;
    renderGrid();
  }

  /**
   * Clear all filters and reset.
   */
  function clearFilters() {
    clearTimeout(_searchTimer);
    filterState.categories = [];
    filterState.minCGPA    = 0;
    filterState.maxIncome  = 'any';
    filterState.courses    = [];
    filterState.deadline   = 'any';
    filterState.amount     = 'any';
    filterState.bookmarksOnly = false;
    filterState.query      = '';
    filterState.sortBy     = 'deadline';

    // Reset DOM inputs
    document.querySelectorAll('.filter-category').forEach(el => el.checked = false);
    const cgpaEl = document.getElementById('filter-cgpa');
    if (cgpaEl) { cgpaEl.value = 0; }
    const cgpaLbl = document.getElementById('filter-cgpa-value');
    if (cgpaLbl) cgpaLbl.textContent = '0';
    const incEl = document.getElementById('filter-income');
    if (incEl) incEl.value = 'any';
    const courseEl = document.getElementById('filter-courses');
    if (courseEl) courseEl.value = '';
    const dlEl = document.getElementById('filter-deadline');
    if (dlEl) dlEl.value = 'any';
    const amtEl = document.getElementById('filter-amount');
    if (amtEl) amtEl.value = 'any';
    const bookmarksEl = document.getElementById('filter-bookmarks');
    if (bookmarksEl) bookmarksEl.checked = false;
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';
    const sortEl = document.getElementById('sort-select');
    if (sortEl) sortEl.value = 'deadline';
    closeFilterDrawer();

    _currentPage = 1;
    _filtered = [..._allScholarships];
    renderGrid();
  }

  function closeFilterDrawer() {
    document.getElementById('filter-sidebar')?.classList.remove('open');
    const filterOverlay = document.getElementById('filter-overlay');
    filterOverlay?.classList.remove('show');
    filterOverlay?.setAttribute('aria-hidden', 'true');
    document.getElementById('filter-toggle-btn')?.setAttribute('aria-expanded', 'false');
  }

  /* ─────────────────────────── Modal ─────────────────────────── */

  /**
   * Open modal for a given scholarship ID.
   * @param {string} scholarshipId
   */
  function openModal(scholarshipId) {
    const sch = _allScholarships.find(s => s.id === scholarshipId);
    if (!sch) return;

    let modal = document.getElementById('scholarship-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scholarship-modal';
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'modal-title');
      modal.innerHTML = `
        <div class="modal-box" role="document">
          <button class="modal-close btn-icon" aria-label="Close modal" onclick="ScholarshipsModule.closeModal()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="modal-content" id="modal-content"></div>
        </div>`;
      document.body.appendChild(modal);
    }

    if (!modal.dataset.eventsBound) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
      });
      modal.dataset.eventsBound = 'true';
    }

    document.getElementById('modal-content').innerHTML = renderScholarshipModal(sch);
    modal.hidden = false;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus trap — focus first focusable element
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
  }

  /**
   * Close the scholarship modal.
   */
  function closeModal() {
    const modal = document.getElementById('scholarship-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.hidden = true;
      document.body.style.overflow = '';
    }
  }

  /* ─────────────────────────── Init ─────────────────────────── */

  /**
   * Main initialization function for scholarships.html.
   */
  function initScholarshipsPage() {
    // Load data
    _allScholarships = global.Storage?.getScholarships?.() ?? global.ScholarData?.scholarships ?? [];
    _currentUser     = global.Storage?.getCurrentUser?.() ?? null;

    // Apply filters from URL parameters.
    const urlParams  = new URLSearchParams(window.location.search);
    const qParam     = urlParams.get('q') || '';
    const categoryParam = urlParams.get('category');
    const bookmarksParam = urlParams.get('bookmarks');
    const searchEl   = document.getElementById('search-input');
    if (searchEl && qParam) {
      searchEl.value      = qParam;
      filterState.query   = qParam;
    }
    if (categoryParam) {
      const normalizedCategory = categoryParam.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const aliases = {
        'merit based': 'merit',
        'need based': 'means',
        'financial need': 'means',
        'science research': 'science',
        'science research fellowships': 'science',
      };
      const selectedCategory = aliases[normalizedCategory] || normalizedCategory.replace(/ /g, '-');
      const categoryInput = Array.from(document.querySelectorAll('.filter-category'))
        .find(input => input.value === selectedCategory);
      if (categoryInput) {
        categoryInput.checked = true;
        filterState.categories = [categoryInput.value];
      }
    }
    filterState.bookmarksOnly = bookmarksParam === 'true';
    const bookmarksInput = document.getElementById('filter-bookmarks');
    if (bookmarksInput) bookmarksInput.checked = filterState.bookmarksOnly;

    // Apply initial filters
    _filtered = applyFilters(_allScholarships, filterState, filterState.query);
    renderGrid();

    // Wire search
    if (searchEl) {
      searchEl.addEventListener('input', e => handleSearch(e.target.value));
    }
    const searchForm = document.getElementById('scholarship-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(_searchTimer);
        applySearch(searchEl?.value ?? '');
      });
    }

    // Wire filters
    document.querySelectorAll('.filter-category').forEach(el =>
      el.addEventListener('change', handleFilterChange));
    const bookmarksEl = document.getElementById('filter-bookmarks');
    if (bookmarksEl) bookmarksEl.addEventListener('change', handleFilterChange);

    ['filter-cgpa', 'filter-income', 'filter-courses', 'filter-deadline', 'filter-amount']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handleFilterChange);
      });

    // CGPA slider live label
    const cgpaEl = document.getElementById('filter-cgpa');
    const cgpaLbl = document.getElementById('filter-cgpa-value');
    if (cgpaEl && cgpaLbl) {
      cgpaEl.addEventListener('input', () => { cgpaLbl.textContent = cgpaEl.value; });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    // Sort dropdown
    const sortEl = document.getElementById('sort-select');
    if (sortEl) sortEl.addEventListener('change', e => handleSortChange(e.target.value));

    // View toggle buttons
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });

    // Load More button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);

    // Filter sidebar toggle (mobile)
    const filterToggle = document.getElementById('filter-toggle-btn');
    const filterSidebar = document.getElementById('filter-sidebar');
    if (filterToggle && filterSidebar) {
      filterToggle.addEventListener('click', () => {
        const open = filterSidebar.classList.toggle('open');
        filterToggle.setAttribute('aria-expanded', String(open));
        const overlay = document.getElementById('filter-overlay');
        overlay?.classList.toggle('show', open);
        overlay?.setAttribute('aria-hidden', String(!open));
      });
    }
    const filterOverlay = document.getElementById('filter-overlay');
    if (filterOverlay) filterOverlay.addEventListener('click', closeFilterDrawer);
    document.getElementById('filter-close-btn')?.addEventListener('click', closeFilterDrawer);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && filterSidebar?.classList.contains('open')) closeFilterDrawer();
    });

    // Eligibility banner
    const banner = document.getElementById('eligibility-banner');
    if (banner) {
      if (_currentUser) {
        banner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Showing personalized match scores for <strong>${_currentUser.name}</strong>.
          <a href="dashboard.html#profile">Update Profile</a> to improve recommendations.`;
        banner.className = 'eligibility-banner logged-in';
      } else {
        banner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <a href="index.html?redirect=scholarships.html">Log in</a> to see your personalized match scores and eligibility.`;
        banner.className = 'eligibility-banner logged-out';
      }
    }
  }

  /* ─────────────────────────── Public API ─────────────────────────── */
  global.ScholarshipsModule = {
    // Core render functions
    renderScholarshipCard,
    renderScholarshipModal,

    // Filter / sort
    applyFilters,
    applySorting,
    filterState,

    // Event handlers
    handleSearch,
    handleFilterChange,
    handleSortChange,

    // UI actions
    toggleView,
    toggleBookmark,
    loadMore,
    clearFilters,

    // Modal
    openModal,
    closeModal,

    // Utilities
    renderEmptyState,
    countdownTimer,

    // Init
    initScholarshipsPage,
  };
}(window));
