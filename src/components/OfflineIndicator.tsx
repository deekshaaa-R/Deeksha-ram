import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="fixed bottom-16 left-4 right-4 sm:right-auto sm:max-w-sm lg:bottom-5 lg:left-5 z-50 flex items-center gap-3 rounded-xl border border-amber-400/50 bg-[#0A1128]/95 text-white px-4 py-3 shadow-2xl backdrop-blur-md"
    >
      <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
        <WifiOff className="w-4 h-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-amber-300">
          You are currently offline
        </div>
        <div className="text-[11px] text-[#A9B4D0] leading-snug">
          Cached pages &amp; hardware specs remain available. Live GPS updates pause until reconnected.
        </div>
      </div>
    </div>
  );
}
