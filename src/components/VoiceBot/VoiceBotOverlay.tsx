import React, { useEffect } from 'react';
import { VoiceBotHook } from '@/types/voice';
import VoiceOrb from './VoiceOrb';
import VoiceTranscript from './VoiceTranscript';
import PropertyCard from '@/components/PropertyCard';

interface VoiceBotOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  voiceHook: VoiceBotHook;
}

export default function VoiceBotOverlay({ isOpen, onClose, voiceHook }: VoiceBotOverlayProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="w-full h-20 flex items-center justify-between px-6 sm:px-10 shrink-0 border-b border-white/10">
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white"
          aria-label="Close Voice Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            JLL
          </div>
          <span className="text-white/80 font-medium tracking-wide">JLL Assistant</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center overflow-y-auto px-4 py-8">
        
        {/* Orb Section */}
        <div className="flex-1 flex flex-col justify-center shrink-0 min-h-[300px]">
          <VoiceOrb 
            state={voiceHook.state} 
            onClick={voiceHook.startSession} 
          />
        </div>

        {/* Transcript Section */}
        <div className="shrink-0">
          <VoiceTranscript 
            state={voiceHook.state}
            transcript={voiceHook.transcript}
            botText={voiceHook.botText}
          />
        </div>

        {/* Error Handle */}
        {voiceHook.error && (
          <div className="text-center mt-4 text-red-300">
            {voiceHook.error}
            {(voiceHook.error.toLowerCase().includes('permission') || voiceHook.error.toLowerCase().includes('failed')) && (
               <div className="text-sm mt-1 opacity-80">
                 Please check microphone permissions or server connection.
               </div>
            )}
          </div>
        )}

      </div>

      {/* Property Results Slider */}
      {voiceHook.properties.length > 0 && (
        <div className="w-full shrink-0 bg-black/30 border-t border-white/5 pb-8 pt-4 px-4 overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 items-start justify-start hide-scrollbar snap-x snap-mandatory">
            {voiceHook.properties.slice(0, 5).map((prop, idx) => {
               // Normalization to bridge the gap with the Text Agent component
               const priceObj = prop.configs?.[0];
               const price = priceObj?.FinalPrice || (priceObj as any)?.Price || (priceObj as any)?.price || 'Price on request';
               const area = priceObj?.Super_Built_Up_Area || priceObj?.Carpet_Area || 'TBD';

               const mappedProp = {
                  ...prop,
                  price: typeof price === 'number' ? `₹${price.toLocaleString()} Lakhs` : price,
                  area: area,
               };

               return (
                 <div key={idx} className="shrink-0 w-[240px] snap-center">
                   <PropertyCard property={mappedProp} />
                 </div>
               )
            })}
          </div>
        </div>
      )}

      {/* Hide Scrollbars CSS */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}
