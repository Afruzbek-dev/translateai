
export type Genre = 
  | 'fiction' | 'novel' | 'romance' | 'fantasy' | 'sci-fi' 
  | 'self-help' | 'psychology' | 'business' | 'academic' 
  | 'religious' | 'biography' | 'history' | 'children';

export interface Chapter {
  id: string;
  title: string;
  originalText: string;
  translatedText?: string;
  status: 'pending' | 'translating' | 'completed';
}

export interface BookMetadata {
  title: string;
  author: string;
  detectedLanguage: string;
  genre: Genre;
  summary: string;
}

export interface TranslationProject {
  id: string;
  fileName: string;
  metadata?: BookMetadata;
  chapters: Chapter[];
  progress: number;
}
