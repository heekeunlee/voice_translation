import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  Search 
} from 'lucide-react';
import type { GlossaryItem } from '../types';

interface GlossaryModalProps {
  isOpen: boolean;
  glossary: GlossaryItem[];
  onClose: () => void;
  onAddGlossary: (item: Omit<GlossaryItem, 'id'>) => void;
  onDeleteGlossary: (id: string) => void;
  onResetDefault: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  glossary,
  onClose,
  onAddGlossary,
  onDeleteGlossary,
  onResetDefault,
}) => {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [category, setCategory] = useState('IT/AI');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTerm.trim() || !targetTerm.trim()) return;

    onAddGlossary({
      sourceTerm: sourceTerm.trim(),
      targetTerm: targetTerm.trim(),
      category: category.trim() || '일반',
      description: description.trim(),
    });

    setSourceTerm('');
    setTargetTerm('');
    setDescription('');
  };

  const filtered = glossary.filter(
    g => g.sourceTerm.toLowerCase().includes(searchTerm.toLowerCase()) || 
         g.targetTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (g.category && g.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              전문 용어집 및 번역 메모리 (Glossary & TM)
            </h2>
            <p className="text-xs text-slate-400">플리토처럼 고유명사나 특정 분야 용어를 사전에 등록하여 번역 시 강제 고정합니다.</p>
          </div>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 mb-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-purple-400" /> 새로운 전문 용어 등록
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="원문 단어/고유명사 (예: Antigravity)"
              value={sourceTerm}
              onChange={(e) => setSourceTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500 transition"
              required
            />
            <input
              type="text"
              placeholder="지정 번역어 (예: 안티그래비티)"
              value={targetTerm}
              onChange={(e) => setTargetTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500 transition"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="IT/AI">IT / AI 기술</option>
              <option value="비즈니스">비즈니스 / 금융</option>
              <option value="의료/과학">의료 / 생명과학</option>
              <option value="영어 이디엄">영어 관용구</option>
              <option value="고유명사">회사명 / 인명</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="설명 또는 문맥 (선택 사항)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500 transition"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>용어 추가</span>
            </button>
          </div>
        </form>

        {/* List Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="등록된 용어 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500 transition"
              />
            </div>
            <button
              onClick={onResetDefault}
              className="text-[11px] text-slate-400 hover:text-purple-300 transition"
            >
              기본 용어 복원
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {item.category || '용어'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.sourceTerm}</span>
                      <span className="text-[11px] text-purple-400">➔</span>
                      <span className="text-xs font-bold text-emerald-300">{item.targetTerm}</span>
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteGlossary(item.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
