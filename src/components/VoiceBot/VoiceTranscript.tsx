import { VoiceState } from '@/types/voice';

interface VoiceTranscriptProps {
  transcript: string;
  botText: string;
  state: VoiceState;
}

export default function VoiceTranscript({ transcript, botText, state }: VoiceTranscriptProps) {
  const isIdleBlank = state === 'idle' && !transcript && !botText;

  return (
    <div className="w-full max-w-[480px] mx-auto p-4 flex flex-col gap-6 min-h-[160px] justify-end">
      {isIdleBlank && (
        <div className="text-center text-white/50 text-sm italic animate-fade-in flex flex-col gap-2">
          <p>Ask me anything about properties in India</p>
          <div className="flex flex-col gap-1 text-xs">
            <span>"Show 3BHK in Anna Nagar"</span>
            <span>"Apartments in Bangalore"</span>
            <span>"Ready to move flats in Chennai"</span>
          </div>
        </div>
      )}

      {transcript && (
        <div className="flex flex-col gap-1 items-end animate-fade-in w-full pl-8">
          <span className="text-xs text-white/60 uppercase tracking-wider font-semibold">You said:</span>
          <p className="text-white text-base font-medium bg-white/10 px-4 py-3 rounded-2xl rounded-tr-sm text-right inline-block">
            {transcript}
          </p>
        </div>
      )}

      {botText && (
        <div className="flex flex-col gap-1 items-start animate-fade-in w-full pr-8">
          <span className="text-xs text-blue-300/80 uppercase tracking-wider font-semibold">JLL Assistant:</span>
          <p className="text-blue-50 text-[15px] leading-relaxed bg-[#185FA5]/40 border border-[#185FA5]/30 px-4 py-3 rounded-2xl rounded-tl-sm inline-block">
            {botText}
          </p>
        </div>
      )}

      {state === 'listening' && !botText && (
        <div className="flex gap-1 animate-fade-in ml-2 mt-4 opacity-70">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}
