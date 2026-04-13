export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceMessage {
  type: 'state' | 'transcript' | 'llm_text' | 'properties' | 'error';
  state?: VoiceState;
  text?: string;
  data?: PropertyProject[];
  total?: number;
  message?: string;
}

export interface PropertyProject {
  _id: string;
  Project_Name_Original: string;
  Location: string;
  City: string;
  Project_Type: string;
  State_Of_Construction: string;
  configs: Array<{
    Config_Type: string;
    Super_Built_Up_Area: string;
    FinalPrice: number;
    Carpet_Area: string;
  }>;
  files: Array<{
    Project_File_Path: string;
    Project_File_Type: string;
  }>;
  developer: Array<{ Connection_Name: string }>;
  amenities: Array<{ Attribute_Value: string }>;
  PosessionDate: string;
}

export interface VoiceBotHook {
  state: VoiceState;
  transcript: string;
  botText: string;
  properties: PropertyProject[];
  totalProperties: number;
  isOpen: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  openOverlay: () => void;
  closeOverlay: () => void;
  error: string | null;
}
