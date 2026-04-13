import Chatbot from '@/components/Chatbot';
import VoiceBotButton from '@/components/VoiceBot/VoiceBotButton';
import VoiceBotOverlay from '@/components/VoiceBot/VoiceBotOverlay';
import { useVoiceBot } from '@/components/VoiceBot/useVoiceBot';

export default function Home() {
  const voiceHook = useVoiceBot();

  return (
    <div className="h-screen w-full relative">
      <VoiceBotButton 
        onClick={voiceHook.openOverlay} 
        isActive={voiceHook.isOpen} 
      />
      <VoiceBotOverlay 
        isOpen={voiceHook.isOpen} 
        onClose={voiceHook.closeOverlay} 
        voiceHook={voiceHook} 
      />
      <Chatbot />
    </div>
  );
}
