
import React, { useState, useEffect, useRef } from 'react';
import FileUploader from './components/FileUploader';
import Reader from './components/Reader';
import { analyzeBookContent, splitIntoChapters, translateChapter } from './services/geminiService';
import { exportToPDF, exportToDOCX } from './services/exportService';
import { TranslationProject, Chapter, BookMetadata } from './types';

const STORAGE_KEY = 'uztrans_active_project';

const App: React.FC = () => {
  const [project, setProject] = useState<TranslationProject | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const projectRef = useRef<TranslationProject | null>(null);
  projectRef.current = project;

  // Load project on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setProject(parsed);
        setLastSaved(new Date());
      } catch (e) {
        console.error("Failed to load saved project", e);
      }
    }
  }, []);

  // Auto-save every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectRef.current) {
        saveToLocalStorage(projectRef.current);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const saveToLocalStorage = (data: TranslationProject) => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Auto-save failed (likely quota limit)", e);
      setSaveStatus('idle');
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        throw new Error("File is empty or could not be read.");
      }
      
      const metadata = await analyzeBookContent(text);
      const chapterData = await splitIntoChapters(text);
      
      const chapters: Chapter[] = chapterData.length > 0 ? chapterData.map((c, i) => ({
        id: `ch-${i}`,
        title: c.title || `Bob ${i + 1}`,
        originalText: c.content || "",
        status: 'pending' as const
      })) : [{
        id: 'ch-0',
        title: 'Barcha matn',
        originalText: text.substring(0, 10000),
        status: 'pending' as const
      }];

      // Filter out chapters with no content to avoid API errors
      const validChapters = chapters.filter(c => c.originalText.trim().length > 0);
      
      if (validChapters.length === 0) {
        throw new Error("Kitobdan foydali matn topilmadi.");
      }

      const newProject = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        metadata,
        chapters: validChapters,
        progress: 0
      };

      setProject(newProject);
      saveToLocalStorage(newProject);
    } catch (error: any) {
      console.error("Detailed process error:", error);
      const msg = error?.message || "Internal Error. This usually happens when the text is too large.";
      alert(`Xatolik yuz berdi: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startTranslation = async () => {
    if (!project) return;
    
    const currentChapter = project.chapters[activeChapterIndex];
    if (!currentChapter || currentChapter.status === 'completed') return;

    if (!currentChapter.originalText || currentChapter.originalText.trim().length === 0) {
      alert("Bu bobda tarjima qilish uchun matn yo'q.");
      return;
    }

    setIsTranslating(true);
    const updatedChapters = [...project.chapters];
    updatedChapters[activeChapterIndex].status = 'translating';
    setProject({ ...project, chapters: updatedChapters });

    try {
      const translation = await translateChapter(
        currentChapter.originalText,
        project.metadata!.genre,
        `Book: ${project.metadata!.title} by ${project.metadata!.author}`
      );

      updatedChapters[activeChapterIndex] = {
        ...currentChapter,
        translatedText: translation,
        status: 'completed'
      };

      const completedCount = updatedChapters.filter(c => c.status === 'completed').length;
      const progress = Math.round((completedCount / updatedChapters.length) * 100);

      const updatedProject = {
        ...project,
        chapters: updatedChapters,
        progress
      };

      setProject(updatedProject);
      saveToLocalStorage(updatedProject);
    } catch (err: any) {
      console.error("Translation error:", err);
      updatedChapters[activeChapterIndex].status = 'pending';
      setProject({ ...project, chapters: updatedChapters });
      
      const errorMessage = err?.message || "Noma'lum xatolik";
      alert(`Tarjima to'xtab qoldi: ${errorMessage}. Iltimos, qaytadan urinib ko'ring.`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!project) return;
    setIsExporting(format);
    try {
      if (format === 'pdf') await exportToPDF(project);
      else await exportToDOCX(project);
    } catch (err) {
      console.error(err);
      alert('Eksport qilishda xatolik yuz berdi.');
    } finally {
      setIsExporting(null);
    }
  };

  const resetProject = () => {
    if (window.confirm("Loyihani yopishni xohlaysizmi? Saqlanmagan o'zgarishlar yo'qolishi mumkin.")) {
      setProject(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const completedChaptersCount = project?.chapters.filter(c => c.status === 'completed').length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">
            <i className="fas fa-book-open"></i>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">UzTrans AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold leading-none">Professional Uzbek Literary Translation</p>
          </div>
        </div>

        {project && (
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden lg:flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${project.progress}%` }}
                   ></div>
                </div>
                {saveStatus === 'saving' && <span className="text-[10px] text-indigo-500 animate-pulse font-bold">SAVING...</span>}
                {saveStatus === 'saved' && <span className="text-[10px] text-green-500 font-bold"><i className="fas fa-check"></i> SAVED</span>}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <span>{project.progress}% Tarjima qilindi</span>
                 {lastSaved && <span className="opacity-60">• So'nggi saqlash: {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleExport('pdf')}
                disabled={completedChaptersCount === 0 || isExporting !== null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all
                  ${completedChaptersCount > 0 ? 'bg-white border-slate-200 text-slate-700 hover:border-red-400 hover:text-red-600' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}
                `}
                title="Download as PDF"
              >
                {isExporting === 'pdf' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button 
                onClick={() => handleExport('docx')}
                disabled={completedChaptersCount === 0 || isExporting !== null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all
                  ${completedChaptersCount > 0 ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}
                `}
                title="Download as DOCX"
              >
                {isExporting === 'docx' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-word"></i>}
                <span className="hidden sm:inline">DOCX</span>
              </button>
            </div>

            <button 
              onClick={resetProject}
              className="text-slate-400 hover:text-red-500 transition-colors ml-2"
            >
              <i className="fas fa-times-circle text-xl"></i>
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-6 md:p-10 flex flex-col">
        {!project ? (
          <div className="max-w-4xl mx-auto w-full mt-10 md:mt-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 serif mb-4">
                Dunyo adabiyotini O'zbekistonga olib keling
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                Bizning sun'iy intellektimiz shunchaki so'zlarni tarjima qilmaydi. U har bir kitobning hissiyotini, kontekstini va o'ziga xos ruhini qamrab oladi.
              </p>
            </div>
            <FileUploader onFileSelect={handleFileSelect} isLoading={isProcessing} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              {[
                { icon: 'fa-brain', title: 'Janrni tushunish', desc: 'Badiiy, texnik yoki akademik uslublarni avtomatik aniqlaydi.' },
                { icon: 'fa-feather-pointed', title: 'Adabiy sifat', desc: 'Silliq o\'qilishi uchun jumlalarni sayqallaydi.' },
                { icon: 'fa-language', title: 'Madaniy moslashuv', desc: 'Idiomalar va metaforalarni o\'zbek tilidagi tabiiy muqobillariga o\'zgartiradi.' }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xl mb-4">
                    <i className={`fas ${feature.icon}`}></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
            <aside className="w-full lg:w-80 flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="pb-4 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Kitob ma'lumotlari</h4>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="font-bold text-indigo-900 line-clamp-1">{project.metadata?.title}</p>
                    <p className="text-xs text-indigo-700">{project.metadata?.author}</p>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded font-bold uppercase">{project.metadata?.genre}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-bold uppercase">{project.metadata?.detectedLanguage}</span>
                    </div>
                  </div>
                  {completedChaptersCount > 0 && (
                    <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                      <i className="fas fa-check"></i> {completedChaptersCount} bob tayyor
                    </p>
                  )}
               </div>

               <div className="flex-1 overflow-y-auto pr-1">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Boblar</h4>
                 <div className="space-y-1">
                   {project.chapters.map((ch, i) => (
                     <button
                        key={ch.id}
                        onClick={() => setActiveChapterIndex(i)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group
                          ${activeChapterIndex === i ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}
                        `}
                     >
                       <span className="truncate mr-2">{i + 1}. {ch.title}</span>
                       {ch.status === 'completed' && <i className="fas fa-check-circle text-green-400"></i>}
                       {ch.status === 'translating' && <i className="fas fa-circle-notch fa-spin text-indigo-300"></i>}
                     </button>
                   ))}
                 </div>
               </div>

               <button 
                onClick={startTranslation}
                disabled={isTranslating || project.chapters[activeChapterIndex].status === 'completed'}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                  ${project.chapters[activeChapterIndex].status === 'completed' 
                    ? 'bg-green-100 text-green-600 cursor-default' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}
                  ${isTranslating ? 'opacity-70 pointer-events-none' : ''}
                `}
               >
                 {isTranslating ? (
                   <><i className="fas fa-magic animate-pulse"></i> Tarjima qilinmoqda...</>
                 ) : project.chapters[activeChapterIndex].status === 'completed' ? (
                   <><i className="fas fa-check-double"></i> Tayyor</>
                 ) : (
                   <><i className="fas fa-wand-sparkles"></i> Bobni tarjima qilish</>
                 )}
               </button>
            </aside>

            <div className="flex-1 min-w-0">
               <Reader chapter={project.chapters[activeChapterIndex]} />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 text-center text-slate-400 text-xs">
         &copy; 2024 UzTrans AI - Professional Book Translation Engine Powered by Gemini 3
      </footer>
    </div>
  );
};

export default App;
