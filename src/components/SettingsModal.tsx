import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Key, 
  Cpu, 
  Volume2, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              환경 설정 및 AI 번역 엔진
            </h2>
            <p className="text-xs text-gray-500">Gemini 2.0 Flash 초저지연 스트리밍 및 음성 옵션을 설정하세요.</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* AI Engine Selection */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              AI 번역 엔진 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, engine: 'gemini-2.0-flash' })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  formData.engine === 'gemini-2.0-flash'
                    ? 'bg-indigo-50 border-indigo-500 text-gray-900 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600">Gemini 2.0 Flash</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">초저지연 추천</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Google 차세대 초고속 멀티모달 번역</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, engine: 'smart-local' })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  formData.engine === 'smart-local'
                    ? 'bg-indigo-50 border-indigo-500 text-gray-900 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600">스마트 로컬 엔진</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">무료 / No Key</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">API 키 없이 즉시 브라우저에서 사용 가능</p>
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          {formData.engine.startsWith('gemini') && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>키 발급받기 (무료)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="AIzaSy... (입력하지 않으면 스마트 로컬 엔진으로 자동 작동)"
                value={formData.geminiApiKey}
                onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 transition font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                API 키는 사용자의 로컬 브라우저에만 안전하게 보관됩니다.
              </p>
            </div>
          )}

          {/* Disfluency Filter Toggle */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>말버릇 및 비문 자동 정제 (Disfluency Removal)</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                발화 중 &lsquo;어...&rsquo;, &lsquo;음...&rsquo;, &lsquo;그...&rsquo;, &lsquo;you know&rsquo; 같은 군더더기를 실시간으로 걸러냅니다.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.disfluencyFilter}
              onChange={(e) => setFormData({ ...formData, disfluencyFilter: e.target.checked })}
              className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Auto TTS & Speed */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-pink-600" />
                  <span>번역 완료 시 자동 음성 재생 (Auto-TTS)</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  문장 번역이 완료되면 원어민 발음으로 즉시 들려줍니다.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoTts}
                onChange={(e) => setFormData({ ...formData, autoTts: e.target.checked })}
                className="w-5 h-5 rounded accent-pink-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              <span>{isSaved ? '저장되었습니다!' : '설정 저장하기'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
