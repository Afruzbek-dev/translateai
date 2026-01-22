
import React from 'react';
import { Chapter } from '../types';

interface ReaderProps {
  chapter: Chapter;
}

const Reader: React.FC<ReaderProps> = ({ chapter }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 italic">{chapter.title}</h3>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Uzbek (Translated)</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden divide-x divide-slate-200">
        {/* Original Text */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-600 leading-relaxed bg-slate-50/50">
          <div className="max-w-2xl mx-auto">
             <span className="block text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">Original Text</span>
             <div className="whitespace-pre-wrap text-lg opacity-80">{chapter.originalText}</div>
          </div>
        </div>

        {/* Translated Text */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-800 leading-relaxed">
          <div className="max-w-2xl mx-auto">
             <span className="block text-xs font-bold text-indigo-400 mb-4 tracking-widest uppercase">O'zbekcha Tarjima</span>
             {chapter.status === 'translating' ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <i className="fas fa-sparkles fa-spin text-3xl mb-4 text-indigo-400"></i>
                  <p className="animate-pulse">Gemini is weaving Uzbek literature...</p>
                </div>
             ) : (
                <div className="whitespace-pre-wrap text-xl serif leading-relaxed tracking-wide">
                  {chapter.translatedText || "Translation will appear here..."}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
