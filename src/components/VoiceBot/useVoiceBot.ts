import { useState, useRef } from 'react';
import { VoiceState, VoiceBotHook, PropertyProject } from '@/types/voice';

export function useVoiceBot(): VoiceBotHook {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [botText, setBotText] = useState('');
  const [properties, setProperties] = useState<PropertyProject[]>([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      isPlayingRef.current = false;
      return;
    }

    const chunk = audioQueueRef.current.shift();
    if (!chunk) {
      isPlayingRef.current = false;
      return;
    }

    try {
      const audioBuffer = await audioContext.decodeAudioData(chunk);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        processAudioQueue(); // Recursively play next
      };

      source.start();
    } catch (e) {
      console.error('Audio playback error', e);
      isPlayingRef.current = false;
      processAudioQueue();
    }
  };

  const startSession = async () => {
    setError(null);
    setTranscript('');
    setBotText('');
    setProperties([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } 
      });

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }

      const sessionId = crypto.randomUUID();
      const wsUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:8000/ws/voice';
      const ws = new WebSocket(`${wsUrl}/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'start', session_id: sessionId }));
        setState('listening');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'state') setState(msg.state);
            if (msg.type === 'transcript') setTranscript(msg.text);
            if (msg.type === 'llm_text') setBotText(msg.text);
            if (msg.type === 'properties') {
              setProperties(msg.data);
              setTotalProperties(msg.total || 0);
            }
            if (msg.type === 'error') {
              setError(msg.message);
              setState('error');
            }
          } catch (e) {
            console.error('WS msg parse error', e);
          }
        } else {
          // Binary audio chunk (TTS)
          const arrayBuffer = await event.data.arrayBuffer();
          audioQueueRef.current.push(arrayBuffer);
          processAudioQueue();
        }
      };

      ws.onerror = () => {
        setError("Connection failed");
        setState("error");
      };

      ws.onclose = () => {
        if (state !== 'idle' && state !== 'error') {
            setState('idle');
        }
      };

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Use webm as polyfill; backend converts or accepts it
      });

      mediaRecorder.ondataavailable = (e) => {
        if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
          ws.send(e.data);
        }
      };

      mediaRecorder.start(20); // 20ms chunks
      mediaRecorderRef.current = mediaRecorder;

    } catch (e: any) {
      setError(e.name === "NotAllowedError" ? "Microphone permission denied" : e.message);
      setState('error');
    }
  };

  const stopSession = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    
    audioQueueRef.current = [];
    audioContextRef.current?.suspend();
    setState('idle');
  };

  const openOverlay = () => {
    setIsOpen(true);
    // Optional auto-start:
    // startSession();
  };

  const closeOverlay = () => {
    stopSession();
    setIsOpen(false);
  };

  return {
    state,
    transcript,
    botText,
    properties,
    totalProperties,
    isOpen,
    startSession,
    stopSession,
    openOverlay,
    closeOverlay,
    error
  };
}
