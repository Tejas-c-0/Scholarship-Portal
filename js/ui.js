/**
 * ui.js — ScholarPath UI utilities module
 * Depends on: storage.js (window.Storage)
 * Import order: storage.js → auth.js → ui.js → page scripts
 *
 * Exposed as: window.UI = { ... }
 */

window.UI = (() => {

  // ─────────────────────────────────────────────
  // Toast notifications
  // ─────────────────────────────────────────────

  /**
   * Display a dismissible toast notification.
   * Automatically creates #toast-container if not present.
   *
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='success']
   * @param {number} [duration=4000] — ms before auto-dismiss
   */
  function showToast(message, type = 'success', duration = 4000) {
    // Ensure container exists
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', 'Notifications');
      container.style.cssText = [
        'position:fixed',
        'bottom:1.5rem',
        'right:1.5rem',
        'z-index:9999',
        'display:flex',
        'flex-direction:column',
        'gap:0.75rem',
        'pointer-events:none',
      ].join(';');
      document.body.appendChild(container);
    }

    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const colorMap = {
      success: { bg: '#16a34a', border: '#15803d' },
      error:   { bg: '#dc2626', border: '#b91c1c' },
      warning: { bg: '#d97706', border: '#b45309' },
      info:    { bg: '#2563eb', border: '#1d4ed8' },
    };

    const { bg, border } = colorMap[type] || colorMap.info;

    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.cssText = [
      `background:${bg}`,
      `border:1px solid ${border}`,
      'color:#fff',
      'padding:0.875rem 1.25rem',
      'border-radius:0.625rem',
      'box-shadow:0 10px 30px rgba(0,0,0,0.25)',
      'display:flex',
      'align-items:center',
      'gap:0.625rem',
      'max-width:360px',
      'min-width:200px',
      'pointer-events:all',
      'opacity:0',
      'transform:translateY(1rem)',
      'transition:opacity 0.3s ease, transform 0.3s ease',
      'font-size:0.9375rem',
      'line-height:1.4',
      'font-family:inherit',
    ].join(';');

    toast.innerHTML = `
      <span style="flex-shrink:0">${icons[type] || icons.info}</span>
      <span style="flex:1">${message}</span>
      <button
        aria-label="Dismiss notification"
        style="background:none;border:none;color:#fff;cursor:pointer;padding:0;line-height:1;opacity:0.8;flex-shrink:0;font-size:1.125rem;"
        onclick="this.closest('[role=alert]').remove()"
      >×</button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });
    });

    // Auto-dismiss
    const timer = setTimeout(() => _dismissToast(toast), duration);

    // Cancel auto-dismiss on hover
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      setTimeout(() => _dismissToast(toast), 1500);
    });
  }

  /** @private */
  function _dismissToast(toast) {
    if (!toast || !toast.isConnected) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem)';
    setTimeout(() => toast.remove(), 320);
  }

  // ─────────────────────────────────────────────
  // Modal dialog
  // ─────────────────────────────────────────────

  /**
   * Create and show a modal dialog.
   *
   * @param {string} title
   * @param {string} content — HTML string
   * @param {Array<{label:string, onClick:function, className?:string}>} [actions=[]]
   */
  function showModal(title, content, actions = []) {
    closeModal(); // Remove any existing modal first

    const overlay = document.createElement('div');
    overlay.id = 'sp-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sp-modal-title');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:10000',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.55)',
      'backdrop-filter:blur(4px)',
      'padding:1rem',
      'opacity:0',
      'transition:opacity 0.25s ease',
    ].join(';');

    const actionsHTML = actions.map(a =>
      `<button
        class="btn ${a.className || 'btn-primary'}"
        data-modal-action="${encodeURIComponent(a.label)}"
        style="min-width:7rem"
      >${a.label}</button>`
    ).join('');

    overlay.innerHTML = `
      <div
        id="sp-modal"
        style="
          background:var(--bg-card, #fff);
          color:var(--text-primary, #111);
          border-radius:1rem;
          box-shadow:0 25px 60px rgba(0,0,0,0.35);
          max-width:520px;
          width:100%;
          max-height:85vh;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          transform:scale(0.95) translateY(1rem);
          transition:transform 0.25s ease;
        "
        role="document"
      >
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:1.25rem 1.5rem;
          border-bottom:1px solid var(--border, #e5e7eb);
        ">
          <h2 id="sp-modal-title" style="margin:0;font-size:1.25rem;font-weight:700">${title}</h2>
          <button
            id="sp-modal-close"
            aria-label="Close dialog"
            style="
              background:none;
              border:none;
              cursor:pointer;
              color:var(--text-secondary, #6b7280);
              font-size:1.5rem;
              line-height:1;
              padding:0.25rem;
              border-radius:0.375rem;
            "
          >×</button>
        </div>
        <div style="padding:1.5rem;overflow-y:auto;flex:1">${content}</div>
        ${actions.length > 0 ? `
          <div style="
            padding:1rem 1.5rem;
            border-top:1px solid var(--border, #e5e7eb);
            display:flex;
            gap:0.75rem;
            justify-content:flex-end;
            flex-wrap:wrap;
          ">${actionsHTML}</div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const modal = overlay.querySelector('#sp-modal');
        if (modal) {
          modal.style.transform = 'scale(1) translateY(0)';
        }
      });
    });

    // Wire close button
    overlay.querySelector('#sp-modal-close').addEventListener('click', closeModal);

    // Click outside to close
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    // Escape key to close
    const escHandler = e => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;

    // Wire action buttons
    actions.forEach(a => {
      const btn = overlay.querySelector(`[data-modal-action="${encodeURIComponent(a.label)}"]`);
      if (btn && typeof a.onClick === 'function') {
        btn.addEventListener('click', () => a.onClick());
      }
    });

    // Focus trap — focus first focusable element
    const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
  }

  /**
   * Close and remove the current modal.
   */
  function closeModal() {
    const overlay = document.getElementById('sp-modal-overlay');
    if (!overlay) return;
    if (overlay._escHandler) {
      document.removeEventListener('keydown', overlay._escHandler);
    }
    overlay.style.opacity = '0';
    const modal = overlay.querySelector('#sp-modal');
    if (modal) modal.style.transform = 'scale(0.95) translateY(1rem)';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
    }, 260);
  }

  // ─────────────────────────────────────────────
  // Skeleton loaders
  // ─────────────────────────────────────────────

  /**
   * Inject skeleton loader cards into a container.
   * @param {Element|string} container — DOM element or CSS selector
   * @param {number} [count=3]
   */
  function showSkeleton(container, count = 3) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const skeletonCard = `
      <div class="skeleton-card" aria-hidden="true" style="
        background:var(--bg-card,#f9fafb);
        border-radius:0.75rem;
        padding:1.5rem;
        border:1px solid var(--border,#e5e7eb);
        animation:skeletonPulse 1.5s ease-in-out infinite;
      ">
        <div style="
          height:1rem;
          width:60%;
          background:var(--skeleton-bg,#e5e7eb);
          border-radius:0.375rem;
          margin-bottom:0.75rem;
        "></div>
        <div style="
          height:0.75rem;
          width:90%;
          background:var(--skeleton-bg,#e5e7eb);
          border-radius:0.375rem;
          margin-bottom:0.5rem;
        "></div>
        <div style="
          height:0.75rem;
          width:75%;
          background:var(--skeleton-bg,#e5e7eb);
          border-radius:0.375rem;
          margin-bottom:1rem;
        "></div>
        <div style="display:flex;gap:0.5rem">
          <div style="height:2rem;width:5rem;background:var(--skeleton-bg,#e5e7eb);border-radius:0.375rem;"></div>
          <div style="height:2rem;width:5rem;background:var(--skeleton-bg,#e5e7eb);border-radius:0.375rem;"></div>
        </div>
      </div>
    `;

    // Inject keyframes if not already present
    if (!document.getElementById('sp-skeleton-style')) {
      const style = document.createElement('style');
      style.id = 'sp-skeleton-style';
      style.textContent = `
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }

    el.setAttribute('aria-busy', 'true');
    for (let i = 0; i < count; i++) {
      el.insertAdjacentHTML('beforeend', skeletonCard);
    }
  }

  /**
   * Remove all skeleton loader elements from a container.
   * @param {Element|string} container
   */
  function removeSkeleton(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.querySelectorAll('.skeleton-card').forEach(s => s.remove());
    el.removeAttribute('aria-busy');
  }

  // ─────────────────────────────────────────────
  // Theme
  // ─────────────────────────────────────────────

  /**
   * Toggle between light and dark themes.
   */
  function toggleTheme() {
    const current = Storage.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    Storage.setTheme(next);
    _applyTheme(next);
  }

  /**
   * Apply saved theme on page load.
   */
  function initTheme() {
    const savedTheme = Storage.getTheme();
    const theme = savedTheme === 'dark' ? 'dark' : 'light';
    if (savedTheme !== theme) Storage.setTheme(theme);
    _applyTheme(theme);

    document.querySelectorAll('.theme-toggle, [data-theme-toggle]').forEach(button => {
      if (button.dataset.themeToggleWired) return;
      button.addEventListener('click', toggleTheme);
      button.dataset.themeToggleWired = 'true';
    });
  }

  /** @private */
  function _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Also set color-scheme for native UA elements (scrollbars, inputs, etc.)
    document.documentElement.style.colorScheme = theme;

    // Update any theme-toggle icons
    document.querySelectorAll('[data-theme-icon]').forEach(icon => {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    document.querySelectorAll('[data-theme-toggle-label]').forEach(el => {
      el.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
    document.querySelectorAll('.theme-toggle, [data-theme-toggle]').forEach(button => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      button.setAttribute('title', `Switch to ${nextTheme} mode`);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  }

  // ─────────────────────────────────────────────
  // Scroll reveal
  // ─────────────────────────────────────────────

  /**
   * Set up IntersectionObserver for elements with class `.reveal`.
   * Adds `.revealed` once element enters the viewport.
   */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all immediately
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ─────────────────────────────────────────────
  // Animated counters
  // ─────────────────────────────────────────────

  /**
   * Animate a numeric counter from 0 to `target`.
   * @param {Element} el
   * @param {number} target
   * @param {number} [duration=2000]
   */
  function animateCounter(el, target, duration = 2000) {
    if (!el) return;
    const startTime = performance.now();
    const startVal = 0;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startVal + eased * (target - startVal));
      el.textContent = formatINR(current);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatINR(target);
    }

    requestAnimationFrame(step);
  }

  /**
   * Find all `.counter` elements and animate them when they scroll into view.
   * Reads `data-target` attribute for the target number.
   */
  function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(el => {
        const target = parseInt(el.dataset.target || el.textContent, 10);
        if (!isNaN(target)) animateCounter(el, target);
      });
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target || el.textContent, 10);
            if (!isNaN(target)) animateCounter(el, target);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach(el => observer.observe(el));
  }

  // ─────────────────────────────────────────────
  // Ripple effect
  // ─────────────────────────────────────────────

  /**
   * Create a ripple animation at the click position within a button.
   * @param {MouseEvent} e
   */
  function addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    ripple.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${x}px`,
      `top:${y}px`,
      'position:absolute',
      'border-radius:50%',
      'background:rgba(255,255,255,0.3)',
      'pointer-events:none',
      'transform:scale(0)',
      'animation:rippleAnim 0.6s linear',
    ].join(';');

    // Inject keyframes once
    if (!document.getElementById('sp-ripple-style')) {
      const style = document.createElement('style');
      style.id = 'sp-ripple-style';
      style.textContent = `
        @keyframes rippleAnim {
          to { transform: scale(1); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Ensure button is positioned so the absolute ripple sits inside it
    if (getComputedStyle(btn).position === 'static') {
      btn.style.position = 'relative';
    }
    btn.style.overflow = 'hidden';

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  /**
   * Attach ripple effect to all `.btn` elements in the document.
   */
  function initRipples() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.removeEventListener('click', addRipple); // Avoid duplicates
      btn.addEventListener('click', addRipple);
    });
  }

  // ─────────────────────────────────────────────
  // Formatting helpers
  // ─────────────────────────────────────────────

  /**
   * Format an amount as Indian Rupee string with ₹ symbol.
   * e.g. 120000 → "₹1,20,000"
   * @param {number} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    return '₹' + formatINR(amount);
  }

  /**
   * Format a date string into a human-friendly format.
   * e.g. "2025-03-15" → "15 Mar 2025"
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Calculate the number of days from today until a deadline.
   * Returns a negative number if the deadline has passed.
   * @param {string} dateStr
   * @returns {number}
   */
  function daysUntil(dateStr) {
    if (!dateStr) return -Infinity;
    const deadline = new Date(dateStr);
    const today    = new Date();
    // Strip time components for a day-level comparison
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.round((deadline - today) / (1000 * 60 * 60 * 24));
  }

  /**
   * Return a CSS class based on how close a deadline is.
   * @param {string} dateStr
   * @returns {'deadline-urgent'|'deadline-soon'|'deadline-ok'|'deadline-passed'}
   */
  function getDeadlineClass(dateStr) {
    const days = daysUntil(dateStr);
    if (days < 0)   return 'deadline-passed';
    if (days <= 7)  return 'deadline-urgent';
    if (days <= 30) return 'deadline-soon';
    return 'deadline-ok';
  }

  function getOfficialApplyLink(scholarship) {
    const url = scholarship?.applyLink || scholarship?.website;
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '';
  }

  /**
   * Format a number in the Indian number system (lakhs, crores).
   * e.g. 1200000 → "12,00,000"
   * @param {number} num
   * @returns {string}
   */
  function formatINR(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Math.floor(Number(num));
    const s = n.toString();
    // Handle numbers with more than 3 digits
    if (s.length <= 3) return s;
    // Last 3 digits
    const last3 = s.slice(-3);
    // Everything before last 3
    const rest = s.slice(0, s.length - 3);
    // Insert commas every 2 digits in the rest
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return formatted + ',' + last3;
  }

  // ─────────────────────────────────────────────
  // Navbar & mobile menu
  // ─────────────────────────────────────────────

  /**
   * Initialise sticky navbar behaviour, hamburger menu toggle,
   * and active link highlighting.
   */
  function initNavbar() {
    const navbar = document.querySelector('.navbar, nav[role="navigation"], #navbar, #main-nav');
    if (!navbar) return;

    // Sticky scroll — add .scrolled class when page scrolls down
    const SCROLL_THRESHOLD = 50;
    function handleScroll() {
      if (window.scrollY > SCROLL_THRESHOLD) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Run immediately in case page loaded mid-scroll

    // Active link highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navbar.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || href === `./${currentPage}`) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Hamburger / mobile menu toggle
    initMobileMenu();
  }

  /**
   * Wire up the mobile hamburger toggle.
   * Looks for `[data-menu-toggle]` and `[data-mobile-menu]` or common class names.
   */
  function initMobileMenu() {
    const toggle = document.querySelector(
      '[data-menu-toggle], .mobile-toggle, .hamburger, .nav-toggle, #menu-toggle, #hamburger-btn'
    );
    const menu = document.querySelector(
      '[data-mobile-menu], .mobile-nav, .nav-mobile, #mobile-menu, .nav-links-mobile'
    );

    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.classList.toggle('open', !isOpen);

      if (menu) {
        menu.classList.toggle('open', !isOpen);
        menu.setAttribute('aria-hidden', String(isOpen));
      }
    });

    // Close menu when clicking any nav link (mobile UX)
    if (menu) {
      menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.classList.remove('open');
          menu.classList.remove('open');
          menu.setAttribute('aria-hidden', 'true');
        });
      });
    }

    // Close on outside click
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && (!menu || !menu.contains(e.target))) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('open');
        if (menu) {
          menu.classList.remove('open');
          menu.setAttribute('aria-hidden', 'true');
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // Star rating renderer
  // ─────────────────────────────────────────────

  /**
   * Generate an SVG star rating HTML string.
   * @param {number} rating — 0 to 5 (supports half-stars)
   * @returns {string} HTML string of 5 star SVGs
   */
  function renderStars(rating) {
    const filled  = Math.floor(rating);
    const half    = rating - filled >= 0.5;
    const empty   = 5 - filled - (half ? 1 : 0);

    const starFilled = (key) => `
      <svg key="${key}" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"
        aria-hidden="true" style="display:inline-block;vertical-align:middle">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`;

    const starHalf = (key) => `
      <svg key="${key}" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" aria-hidden="true" style="display:inline-block;vertical-align:middle">
        <defs>
          <linearGradient id="half-${key}">
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="50%" stop-color="#d1d5db"/>
          </linearGradient>
        </defs>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          fill="url(#half-${key})" stroke="#f59e0b" stroke-width="1"/>
      </svg>`;

    const starEmpty = (key) => `
      <svg key="${key}" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="#d1d5db" stroke="#d1d5db" stroke-width="1"
        aria-hidden="true" style="display:inline-block;vertical-align:middle">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`;

    let html = `<span aria-label="Rating: ${rating} out of 5 stars" role="img">`;
    for (let i = 0; i < filled; i++) html += starFilled(i);
    if (half) html += starHalf('h');
    for (let i = 0; i < empty; i++) html += starEmpty(`e${i}`);
    html += `</span>`;
    return html;
  }

  // ─────────────────────────────────────────────
  // Utility functions
  // ─────────────────────────────────────────────

  /**
   * Debounce — delay `fn` execution until `delay` ms after last call.
   * @param {Function} fn
   * @param {number} delay — milliseconds
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Smoothly scroll to a DOM element.
   * @param {string} selector — CSS selector
   */
  function smoothScrollTo(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Copy text to the clipboard using the Clipboard API, with a textarea fallback.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success', 2000);
      return true;
    } catch {
      // Fallback for older browsers or non-HTTPS
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success', 2000);
        return true;
      } catch {
        showToast('Could not copy to clipboard.', 'error', 3000);
        return false;
      }
    }
  }

  /**
   * Trigger the browser's print dialog.
   */
  function printPage() {
    window.print();
  }

  // ─────────────────────────────────────────────
  // Scholarship scoring & filtering
  // ─────────────────────────────────────────────

  /**
   * Calculate a recommendation score (0–100) for a scholarship based on
   * how well it matches a student's profile.
   *
   * Scoring breakdown:
   *   - CGPA match        : 30 points
   *   - Income match      : 25 points
   *   - Category match    : 25 points
   *   - Course match      : 20 points
   *
   * @param {Object} student
   * @param {Object} scholarship
   * @returns {number} 0–100
   */
  function calculateRecommendationScore(student, scholarship) {
    if (!student || !scholarship) return 0;
    const eligibility = scholarship.eligibility && typeof scholarship.eligibility === 'object'
      ? scholarship.eligibility
      : {};
    const requiredGender = String(eligibility.gender || '').toLowerCase();
    const studentGender = String(student.gender || '').toLowerCase();
    if (requiredGender && requiredGender !== studentGender) return 0;

    const requiredStates = Array.isArray(eligibility.states) ? eligibility.states : [];
    if (requiredStates.length && !requiredStates.some(state =>
      String(state).toLowerCase() === String(student.state || '').toLowerCase()
    )) return 0;

    const studentYear = Number(student.year);
    if (Number.isFinite(studentYear)) {
      if (eligibility.minYear && studentYear < Number(eligibility.minYear)) return 0;
      if (eligibility.maxYear && studentYear > Number(eligibility.maxYear)) return 0;
    }

    const disabilityRequirement = eligibility.isDisability ?? eligibility.disability;
    if ((disabilityRequirement === true || String(disabilityRequirement).toLowerCase() === 'yes') &&
        student.isDisability !== true) return 0;

    let score = 0;

    // ── CGPA match (30 pts) ──
    const minCgpa = parseFloat(
      scholarship.minCgpa ?? scholarship.minCGPA ?? scholarship.min_cgpa ?? eligibility.minCGPA ?? 0
    );
    const studentCgpa = parseFloat(student.cgpa || 0);
    if (studentCgpa >= minCgpa) {
      // Full 30 pts if student meets requirement; bonus for exceeding
      const excess = Math.min((studentCgpa - minCgpa) / (10 - minCgpa || 1), 1);
      score += 20 + Math.round(excess * 10);
    }

    // ── Income match (25 pts) ──
    const maxIncomeValue = scholarship.maxIncome ?? scholarship.max_income ?? eligibility.maxIncome;
    const maxIncome = Number(maxIncomeValue) > 0 ? Number(maxIncomeValue) : Infinity;
    const studentIncome = parseFloat(student.income || 0);
    if (studentIncome <= maxIncome) {
      // Full 25 pts if income is under the limit
      // Bonus proximity: closer to 0 earns more points
      const proximity = maxIncome === Infinity ? 0 : Math.max(0, 1 - studentIncome / maxIncome);
      score += 15 + Math.round(proximity * 10);
    }

    // ── Category match (25 pts) ──
    const categoryValues = scholarship.categories || scholarship.eligibleCategories || eligibility.categories || [];
    const scholCategories = (Array.isArray(categoryValues) ? categoryValues : [categoryValues])
      .map(c => String(c).toLowerCase());
    const studentCategory = (student.category || '').toLowerCase();
    if (
      scholCategories.length === 0 ||                       // Open to all
      scholCategories.includes('all') ||
      scholCategories.includes(studentCategory)
    ) {
      score += 25;
    }

    // ── Course match (20 pts) ──
    const courseValues = scholarship.courses || scholarship.eligibleCourses || eligibility.courses || [];
    const scholCourses = (Array.isArray(courseValues) ? courseValues : [courseValues])
      .map(c => String(c).toLowerCase());
    const studentCourse = (student.course || '').toLowerCase();
    if (
      scholCourses.length === 0 ||
      scholCourses.includes('all') ||
      scholCourses.some(c => studentCourse.includes(c) || c.includes(studentCourse))
    ) {
      score += 20;
    }

    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  /**
   * Sort an array of scholarship objects.
   * @param {Object[]} arr
   * @param {'amount'|'deadline'|'name'|'score'} by
   * @returns {Object[]} new sorted array (does not mutate original)
   */
  function sortScholarships(arr, by) {
    if (!Array.isArray(arr)) return [];
    const copy = [...arr];

    switch (by) {
      case 'amount':
        return copy.sort((a, b) => {
          const aAmt = parseFloat(a.amount || a.maxAmount || 0);
          const bAmt = parseFloat(b.amount || b.maxAmount || 0);
          return bAmt - aAmt; // Highest first
        });

      case 'deadline':
        return copy.sort((a, b) => {
          const aDate = new Date(a.deadline || a.lastDate || '9999-12-31').getTime();
          const bDate = new Date(b.deadline || b.lastDate || '9999-12-31').getTime();
          return aDate - bDate; // Soonest first
        });

      case 'name':
        return copy.sort((a, b) =>
          (a.name || a.title || '').localeCompare(b.name || b.title || '', 'en-IN')
        );

      case 'score':
        return copy.sort((a, b) =>
          (b._score || b.recommendationScore || 0) - (a._score || a.recommendationScore || 0)
        );

      default:
        return copy;
    }
  }

  /**
   * Filter an array of scholarships by one or more criteria.
   *
   * @param {Object[]} arr
   * @param {Object} filters
   * @param {string}   [filters.category]        — e.g. 'sc', 'obc'
   * @param {number}   [filters.maxIncome]        — max annual family income in INR
   * @param {number}   [filters.minCgpa]          — minimum CGPA required by student
   * @param {string}   [filters.course]           — course keyword
   * @param {string}   [filters.deadline]         — 'upcoming' | 'thisMonth' | 'thisWeek'
   * @param {string}   [filters.search]           — text search across name/provider/description
   * @param {number}   [filters.minAmount]        — minimum scholarship amount
   * @param {number}   [filters.maxAmount]        — maximum scholarship amount
   * @param {string}   [filters.state]            — state name
   * @returns {Object[]}
   */
  function filterScholarships(arr, filters) {
    if (!Array.isArray(arr)) return [];
    if (!filters || typeof filters !== 'object') return arr;

    const {
      category,
      maxIncome,
      minCgpa,
      course,
      deadline,
      search,
      minAmount,
      maxAmount,
      state,
    } = filters;

    return arr.filter(s => {

      // ── Category ──
      if (category && category !== 'all') {
        const scholCategories = (s.categories || s.eligibleCategories || [])
          .map(c => c.toLowerCase());
        if (
          scholCategories.length > 0 &&
          !scholCategories.includes('all') &&
          !scholCategories.includes(category.toLowerCase())
        ) {
          return false;
        }
      }

      // ── Income ──
      if (maxIncome !== undefined && maxIncome !== null && maxIncome !== '') {
        const scholMax = parseFloat(s.maxIncome || s.max_income);
        if (!isNaN(scholMax) && parseFloat(maxIncome) > scholMax) return false;
      }

      // ── CGPA ──
      if (minCgpa !== undefined && minCgpa !== null && minCgpa !== '') {
        const scholMin = parseFloat(s.minCgpa || s.min_cgpa || 0);
        if (parseFloat(minCgpa) < scholMin) return false;
      }

      // ── Course ──
      if (course && course.trim()) {
        const scholCourses = (s.courses || s.eligibleCourses || [])
          .map(c => c.toLowerCase());
        const courseQ = course.toLowerCase();
        if (
          scholCourses.length > 0 &&
          !scholCourses.includes('all') &&
          !scholCourses.some(c => c.includes(courseQ) || courseQ.includes(c))
        ) {
          return false;
        }
      }

      // ── Deadline ──
      if (deadline && deadline !== 'all') {
        const days = daysUntil(s.deadline || s.lastDate);
        if (days < 0) return false; // Exclude expired
        if (deadline === 'thisWeek'  && days > 7)  return false;
        if (deadline === 'thisMonth' && days > 30) return false;
        if (deadline === 'upcoming'  && days > 90) return false;
      }

      // ── Search ──
      if (search && search.trim()) {
        const q = search.toLowerCase();
        const haystack = [
          s.name || s.title || '',
          s.provider || s.organization || '',
          s.description || '',
          s.state || '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // ── Min amount ──
      if (minAmount !== undefined && minAmount !== null && minAmount !== '') {
        const amt = parseFloat(s.amount || s.maxAmount || 0);
        if (amt < parseFloat(minAmount)) return false;
      }

      // ── Max amount ──
      if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') {
        const amt = parseFloat(s.amount || s.maxAmount || 0);
        if (amt > parseFloat(maxAmount)) return false;
      }

      // ── State ──
      if (state && state.trim() && state.toLowerCase() !== 'all') {
        const scholState = (s.state || '').toLowerCase();
        if (
          scholState !== '' &&
          scholState !== 'all' &&
          scholState !== state.toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  return Object.freeze({
    // Toast
    showToast,

    // Modal
    showModal,
    closeModal,

    // Skeleton
    showSkeleton,
    removeSkeleton,

    // Theme
    toggleTheme,
    initTheme,

    // Scroll reveal
    initScrollReveal,

    // Counters
    animateCounter,
    initCounters,

    // Ripple
    addRipple,
    initRipples,

    // Formatting
    formatCurrency,
    formatDate,
    daysUntil,
    getDeadlineClass,
    getOfficialApplyLink,
    formatINR,

    // Navbar
    initNavbar,
    initMobileMenu,

    // Stars
    renderStars,

    // Utilities
    debounce,
    smoothScrollTo,
    copyToClipboard,
    printPage,

    // Scholarship helpers
    calculateRecommendationScore,
    sortScholarships,
    filterScholarships,
  });

})();
