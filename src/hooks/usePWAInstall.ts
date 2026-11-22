import { useCallback, useEffect, useState } from 'react';
import {
  detectInstallPlatform,
  detectStandaloneMode,
  resolveInstallPromptMode,
  type InstallPlatform,
  type InstallPromptMode,
} from '../utils/pwaLogic';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return detectStandaloneMode({
      displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
      navigatorStandalone: nav.standalone,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });
  });

  const [platform] = useState<InstallPlatform>(() => {
    if (typeof navigator === 'undefined') return 'desktop';
    return detectInstallPlatform({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      if (
        detectStandaloneMode({
          displayModeStandalone: mediaQuery.matches,
          navigatorStandalone: nav.standalone,
          referrer: document.referrer,
        })
      ) {
        setIsInstalled(true);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    mediaQuery.addEventListener('change', syncStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', syncStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerNativeInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    return outcome;
  }, [deferredPrompt]);

  const mode: InstallPromptMode = resolveInstallPromptMode({
    isInstalled,
    hasNativePrompt: Boolean(deferredPrompt),
    platform,
  });

  return {
    isInstalled,
    hasNativePrompt: Boolean(deferredPrompt),
    platform,
    mode,
    triggerNativeInstall,
  };
}
