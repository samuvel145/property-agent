import React from 'react';

interface VoiceBotButtonProps {
  onClick: () => void;
  isActive: boolean;
}

export default function VoiceBotButton({ onClick, isActive }: VoiceBotButtonProps) {
  return (
    <div className="fixed top-6 right-6 z-40 group animate-in fade-in zoom-in duration-500 delay-300">
      <button
        onClick={onClick}
        className={`w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 ${
          isActive 
            ? 'bg-[#1e6ebf] animate-pulse-ring' 
            : 'bg-[#185FA5] hover:bg-[#0C447C]'
        }`}
        title={isActive ? "Voice session active" : "Talk to JLL Assistant"}
        aria-label="Open Voice Assistant"
      >
        <svg className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>

      {/* Tooltip on idle hover */}
      {!isActive && (
        <div className="absolute right-0 top-[60px] opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 text-white text-xs whitespace-nowrap px-3 py-1.5 rounded pointer-events-none shadow-md">
          Talk to JLL Assistant
        </div>
      )}

      {/* Re-use pulse-ring from Orb if active */}
      <style>{`
        @keyframes pulse-ring-btn {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
        }
        .animate-pulse-ring {
          animation: pulse-ring-btn 2s infinite;
        }
      `}</style>
    </div>
  );
}
