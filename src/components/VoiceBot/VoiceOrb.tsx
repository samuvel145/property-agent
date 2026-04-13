import { VoiceState } from '@/types/voice';

export default function VoiceOrb({ state, onClick }: { state: VoiceState, onClick?: () => void }) {
  
  const getOrbStateClasses = () => {
    switch(state) {
      case 'idle':
        return 'bg-[#185FA5] cursor-pointer hover:scale-105 transition-transform duration-200';
      case 'listening':
        return 'bg-[#185FA5] animate-pulse-ring';
      case 'processing':
        return 'bg-[#185FA5] animate-spin-gradient border-4 border-transparent';
      case 'speaking':
        return 'bg-[#185FA5]';
      case 'error':
        return 'bg-red-600 cursor-pointer hover:scale-105';
      default:
        return 'bg-[#185FA5]';
    }
  };

  const getLabel = () => {
    switch(state) {
      case 'idle': return 'Tap microphone to start';
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Something went wrong. Try again.';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); transform: scale(1); }
          70% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); transform: scale(1.15); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s infinite;
        }
        
        @keyframes rotate-gradient {
          100% { transform: rotate(360deg); }
        }
        .animate-spin-gradient {
          background: linear-gradient(#185FA5, #185FA5) padding-box,
                      conic-gradient(#185FA5 0%, #3b82f6 25%, #60a5fa 50%, #eff6ff 75%, #185FA5 100%) border-box;
          animation: rotate-gradient 1.5s linear infinite;
        }

        .bar {
          width: 6px;
          border-radius: 4px;
          background: white;
          animation: equalize 1s infinite alternate;
        }
        .bar:nth-child(1) { height: 16px; animation-delay: 0.1s; }
        .bar:nth-child(2) { height: 32px; animation-delay: 0.4s; }
        .bar:nth-child(3) { height: 24px; animation-delay: 0.2s; }
        
        @keyframes equalize {
          0% { height: 12px; }
          100% { height: 36px; }
        }
      `}</style>
      
      <div 
        onClick={state === 'idle' || state === 'error' ? onClick : undefined}
        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-lg relative ${getOrbStateClasses()}`}
      >
        {state === 'speaking' ? (
          <div className="flex gap-2 items-center justify-center h-12">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        ) : state === 'error' ? (
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className={`w-8 h-8 sm:w-10 sm:h-10 text-white ${state === 'listening' ? 'text-green-300' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>

      <p className="text-white text-lg font-medium opacity-90">{getLabel()}</p>
    </div>
  );
}
