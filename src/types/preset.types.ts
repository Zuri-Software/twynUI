// Preset types matching your Supabase schema and Swift models

export interface Preset {
  id: string; // Supabase UUID
  style_id: string; // 302.AI style identifier  
  name: string;
  image_url: string;
  prompt: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface GenerationBatch {
  id: string;
  images: string[];
  generatedAt: Date;
  preset?: Preset;
}

export interface CharacterModel {
  id: string;
  user_id: string;
  name: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  higgsfield_id?: string; // 302.AI character ID
  thumbnail_url?: string;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export interface GenerationRequest {
  prompt: string;
  style_id: string;
  higgsfield_id?: string; // Optional trained character
  quality?: 'basic' | 'high';
  aspect_ratio?: '3:4' | '1:1' | '16:9';
  enhance_prompt?: boolean;
  negative_prompt?: string;
  seed?: number;
}

export interface GenerationResponse {
  generation_id: string;
  status: string;
  message: string;
}

// Categories (dynamic from Supabase)
export type PresetCategory = 
  | 'portrait' 
  | 'fantasy' 
  | 'cinematic' 
  | 'vintage' 
  | 'abstract' 
  | 'nature' 
  | 'urban'
  | string; // Allow for dynamic categories