import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

function emitGmpQuotaExceeded() {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
}

(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  emitGmpQuotaExceeded();
};

const origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const joined = args.map((a) => String(a)).join(' ');
  if (
    joined.includes('OverQuotaMapError') ||
    joined.includes('QuotaExceededError') ||
    joined.includes('Google Maps JavaScript API error: OverQuota')
  ) {
    emitGmpQuotaExceeded();
  }
  origConsoleError(...args);
};

registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-need-refresh'));
  },
});

createRoot(document.getElementById('root')!).render(<App />);
