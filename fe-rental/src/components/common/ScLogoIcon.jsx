import React from 'react';

export default function ScLogoIcon({ className = "w-10 h-10", innerTextSize = "text-sm" }) {
  return (
    <div className={`${className} bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950 rounded-2xl flex items-center justify-center border border-blue-400/30 shadow-lg shadow-indigo-950/50 relative overflow-hidden flex-shrink-0 group`}>
      {/* Subtle top-left glass highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60 pointer-events-none" />
      <span className={`relative z-10 font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif] ${innerTextSize}`}>
        SC
      </span>
    </div>
  );
}
