export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="1.5"
          width="33"
          height="33"
          rx="8"
          className="fill-[#0A1128] dark:fill-[#111B3A] stroke-[#00D4FF]"
          strokeWidth="2"
        />
        <path
          d="M8.5 11.5L14.5 24.5L18.5 15.5"
          stroke="#00D4FF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27.5 13.5C27.5 11.8 25.9 11 24 11C21.8 11 20.5 12.1 20.5 13.7C20.5 15.5 22.1 16.2 24.2 16.8C26.3 17.4 27.7 18.2 27.7 20.4C27.7 22.4 26 23.8 23.6 23.8C21.4 23.8 19.8 22.8 19.3 21.4"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          VS
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-cyan-700 dark:text-[#00D4FF]">
          Technology
        </span>
      </span>
    </span>
  );
}
