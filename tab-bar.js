(function () {
  localStorage.setItem('role', 'caretaker');

  const page = location.pathname.split('/').pop() || 'caretaker.html';

  const style = document.createElement('style');
  style.textContent = `
    /* ensure content is never hidden behind the fixed tab bar */
    body { padding-bottom: calc(68px + env(safe-area-inset-bottom)) !important; }

    #ct-tab-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: calc(68px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--navy);
      border-top: 2px solid var(--navy-mid);
      display: flex;
      align-items: stretch;
      z-index: 200;
      -webkit-tap-highlight-color: transparent;
    }

    .ct-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-decoration: none;
      color: rgba(255,255,255,0.45);
      font-size: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      transition: color 0.15s, background 0.15s;
      border: none;
      background: none;
      cursor: pointer;
      padding: 8px 4px;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      user-select: none;
    }

    .ct-tab:active { background: rgba(255,255,255,0.07); }

    .ct-tab.active { color: var(--accent); }
    .ct-tab.active .ct-tab-icon { transform: scale(1.18); }

    .ct-tab-icon {
      font-size: 26px;
      line-height: 1;
      transition: transform 0.15s;
      display: block;
    }

    @media (min-width: 600px) {
      .ct-tab { font-size: 12px; }
      .ct-tab-icon { font-size: 24px; }
    }
  `;
  document.head.appendChild(style);

  const tabs = [
    { label: 'Dashboard', icon: '', href: 'caretaker.html'  },
    { label: 'Scanner',   icon: '', href: 'scanner.html'    },
    { label: 'Medicine',  icon: '', href: 'medication.html' },
  ];

  const bar = document.createElement('nav');
  bar.id = 'ct-tab-bar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'Main navigation');

  tabs.forEach(tab => {
    const a = document.createElement('a');
    a.href = tab.href;
    a.className = 'ct-tab' + (page === tab.href ? ' active' : '');
    a.setAttribute('aria-current', page === tab.href ? 'page' : 'false');
    a.innerHTML = `<span>${tab.label}</span>`;
    bar.appendChild(a);
  });

  document.body.appendChild(bar);
})();
