const wa = () => window.WebApp;

function safe(fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.catch(() => undefined);
    return result;
  } catch {
    return undefined;
  }
}

export const bridge = {
  isInMax: () => Boolean(wa()?.initData),
  initData: () => wa()?.initData || '',
  user: () => wa()?.initDataUnsafe?.user ?? null,
  platform: () => wa()?.platform ?? 'web',
  startParam: () => wa()?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('start') || '',

  uiPlatform() {
    const p = this.platform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
  },

  ready() {
    safe(() => wa()?.ready?.());
  },

  openLink(url) {
    if (this.isInMax() && wa()?.openLink) {
      safe(() => wa().openLink(url));
      return;
    }
    window.open(url, '_blank', 'noopener');
  },

  async share({ text, link }) {
    if (this.isInMax()) {
      try {
        if (wa().shareMaxContent) return await wa().shareMaxContent({ text, link });
        if (wa().shareContent) return await wa().shareContent({ text, link });
      } catch {
      }
    }
    if (navigator.share) return navigator.share({ text, url: link });
    await navigator.clipboard?.writeText([text, link].filter(Boolean).join('\n'));
    return 'copied';
  },

  haptic(type = 'light') {
    const h = this.isInMax() ? wa()?.HapticFeedback : null;
    if (!h) return;
    if (type === 'success' || type === 'error' || type === 'warning') safe(() => h.notificationOccurred(type));
    else if (type === 'select') safe(() => h.selectionChanged());
    else safe(() => h.impactOccurred(type));
  },

  backButton: {
    show(handler) {
      const bb = bridge.isInMax() ? wa()?.BackButton : null;
      if (!bb) return () => {};
      safe(() => bb.onClick(handler));
      safe(() => bb.show());
      return () => {
        safe(() => bb.offClick(handler));
        safe(() => bb.hide());
      };
    }
  }
};
