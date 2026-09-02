export type Platform = 'android' | 'windows' | 'web' | 'ios' | 'unknown';

declare global {
  interface Window {
    Capacitor: {
      getPlatform(): string;
    };
    __TAURI__: unknown;
  }
}

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Capacitor (Android/iOS app)
  if (window.Capacitor) {
    const platform = window.Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
    return 'unknown';
  }

  // Check for Tauri (Windows/macOS/Linux app)
  if (window.__TAURI__) {
    return 'windows';
  }

  // Check for PWA standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    // Check if it's Android or iOS based on user agent
    if (/android/i.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
    return 'windows';
  }

  // Check user agent for platform
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/windows/i.test(userAgent)) return 'windows';
  if (/macintosh|mac os x/i.test(userAgent)) return 'windows'; // macOS treated as desktop
  if (/linux/i.test(userAgent)) return 'windows'; // Linux treated as desktop

  return 'web';
}

export function isApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.Capacitor || window.__TAURI__ || window.matchMedia('(display-mode: standalone)').matches);
}

export function isAndroid(): boolean {
  return detectPlatform() === 'android';
}

export function isWindows(): boolean {
  return detectPlatform() === 'windows';
}

export function isIOS(): boolean {
  return detectPlatform() === 'ios';
}

export function isMobile(): boolean {
  const platform = detectPlatform();
  return platform === 'android' || platform === 'ios';
}

export function isDesktop(): boolean {
  const platform = detectPlatform();
  return platform === 'windows';
}

export function getInstallUrl(): string | null {
  const platform = detectPlatform();
  switch (platform) {
    case 'android':
      return '/download/android';
    case 'windows':
      return '/download/windows';
    default:
      return null;
  }
}

export function shouldShowInstallPrompt(): boolean {
  // Don't show if already in app
  if (isApp()) return false;

  // Don't show on iOS (no direct APK install)
  if (isIOS()) return false;

  // Show on Android and Windows
  return isAndroid() || isWindows();
}