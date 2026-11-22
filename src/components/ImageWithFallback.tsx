import { useState } from 'react';
import { Cpu } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallbackLabel?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fallbackLabel,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#111B3A] dark:to-[#0A1128] text-slate-500 dark:text-[#A9B4D0] p-4 text-center ${className}`}
      >
        <Cpu className="w-8 h-8 mb-2 text-cyan-600 dark:text-[#00D4FF]" />
        <span className="text-xs font-medium">{fallbackLabel || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
