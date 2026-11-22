import { useState, type FormEvent } from 'react';
import { ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CONTACT_INFO } from '../data/catalog';
import { validatePhone, validateRequired } from '../utils/storeLogic';

export function FloatingWhatsApp() {
  const { showToast } = useStore();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('GPS Tracker Pricing & Demo');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pErr = validatePhone(phone);
    const tErr = validateRequired(topic, 'Message');
    if (pErr || tErr) {
      setError(pErr || tErr);
      return;
    }
    setError(null);
    setSent(true);
    showToast('WhatsApp callback request queued with our sales desk.');
  };

  const whatsappTopicUrl = `${CONTACT_INFO.whatsappHref}?text=${encodeURIComponent(
    `Hello VS Technology, I would like information about: ${topic}`
  )}`;

  return (
    <div className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-40">
      {open && (
        <div
          role="dialog"
          aria-label="WhatsApp Sales & Support Chat"
          className="mb-3 w-80 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] shadow-2xl overflow-hidden"
        >
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">VS WhatsApp Desk</div>
              <div className="text-[11px] font-mono text-emerald-100">
                {CONTACT_INFO.phoneDisplay} · Quick Reply
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp chat"
              className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <a
              href={whatsappTopicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Chat Now on WhatsApp ({CONTACT_INFO.phoneDisplay})</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>

            <div className="border-t border-slate-200 dark:border-white/10 pt-3">
              {sent ? (
                <div className="space-y-3 text-sm">
                  <p className="text-slate-700 dark:text-[#A9B4D0]">
                    Thank you! A VS Technology specialist will message{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {phone}
                    </span>{' '}
                    from {CONTACT_INFO.phoneDisplay} shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setPhone('');
                      setOpen(false);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
                  <div>
                    <label
                      htmlFor="wa-phone"
                      className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                    >
                      Or Request a WhatsApp Callback
                    </label>
                    <input
                      id="wa-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 97406 40650"
                      className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wa-topic"
                      className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                    >
                      How can we help?
                    </label>
                    <input
                      id="wa-topic"
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-rose-600 dark:text-[#FF4D4F]">{error}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold border border-emerald-600/40 text-emerald-700 dark:text-[#7CFF6B] hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Request Callback</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open WhatsApp chat support"
        aria-expanded={open}
        className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
      >
        <MessageCircle className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
  );
}
