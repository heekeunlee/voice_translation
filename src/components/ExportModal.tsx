import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  FileCode, 
  Check, 
  Copy 
} from 'lucide-react';
import type { TranslationItem } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  items: TranslationItem[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  items,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = (): string => {
    let md = `# PolyVoice Live 실시간 통번역 & 영어 학습 기록\n\n`;
    md += `* 일시: ${new Date().toLocaleString()}\n`;
    md += `* 총 번역 문장 수: ${items.length}개\n\n---\n\n`;

    items.forEach((item, idx) => {
      md += `### ${idx + 1}. [${item.mode.toUpperCase()}] ${new Date(item.timestamp).toLocaleTimeString()}\n`;
      md += `* **원문:** ${item.sourceText}\n`;
      md += `* **번역:** ${item.translatedText}\n`;

      if (item.learningDetails) {
        if (item.learningDetails.naturalAlternative) {
          md += `* **원어민 추천 표현:** ${item.learningDetails.naturalAlternative}\n`;
        }
        if (item.learningDetails.grammarTip) {
          md += `* **문법/뉘앙스 팁:** ${item.learningDetails.grammarTip}\n`;
        }
        if (item.learningDetails.keyVocabulary?.length) {
          md += `* **핵심 어휘:**\n`;
          item.learningDetails.keyVocabulary.forEach(v => {
            md += `  - ${v.word} (${v.ipa || ''}): ${v.meaning}\n`;
          });
        }
      }
      md += `\n---\n\n`;
    });

    return md;
  };

  const handleDownloadFile = (type: 'md' | 'txt') => {
    const content = generateMarkdown();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PolyVoice_Transcript_${new Date().toISOString().slice(0, 10)}.${type}`;
    a.click();
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              통번역 스크립트 & 학습 노트 내보내기
            </h2>
            <p className="text-xs text-slate-400">대화 기록과 AI 문법/어휘 분석 노트를 원하는 포맷으로 저장하세요.</p>
          </div>
        </div>

        {/* Preview Box */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 mb-5 max-h-48 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
          {generateMarkdown()}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => handleDownloadFile('md')}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30"
          >
            <FileCode className="w-4 h-4" />
            <span>Markdown (.md) 저장</span>
          </button>

          <button
            onClick={() => handleDownloadFile('txt')}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            <FileText className="w-4 h-4" />
            <span>텍스트 (.txt) 저장</span>
          </button>

          <button
            onClick={handleCopyClipboard}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '복사 완료!' : '클립보드 복사'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
