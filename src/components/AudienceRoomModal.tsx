import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Globe2, 
  Radio 
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants';

interface AudienceRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

export const AudienceRoomModal: React.FC<AudienceRoomModalProps> = ({
  isOpen,
  onClose,
  roomId = 'poly-live-8831',
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [selectedAudienceLang, setSelectedAudienceLang] = useState('en-US');

  if (!isOpen) return null;

  const roomUrl = `${window.location.origin}/?room=${roomId}&view=audience&lang=${selectedAudienceLang}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              청중 실시간 자막 화면 공유 (Flitto Live)
            </h2>
            <p className="text-xs text-gray-500">발표자의 음성을 청중이 자신의 스마트폰이나 노트북에서 자국어 자막으로 봅니다.</p>
          </div>
        </div>

        {/* QR Code Canvas Mockup */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 border border-gray-200 mb-5">
          <div className="relative p-4 bg-white rounded-2xl shadow-md border border-gray-200 mb-3">
            {/* SVG QR Code Simulation */}
            <svg viewBox="0 0 100 100" className="w-36 h-36">
              <rect x="5" y="5" width="25" height="25" fill="#1e293b" />
              <rect x="10" y="10" width="15" height="15" fill="#ffffff" />
              <rect x="13" y="13" width="9" height="9" fill="#1e293b" />

              <rect x="70" y="5" width="25" height="25" fill="#1e293b" />
              <rect x="75" y="10" width="15" height="15" fill="#ffffff" />
              <rect x="78" y="13" width="9" height="9" fill="#1e293b" />

              <rect x="5" y="70" width="25" height="25" fill="#1e293b" />
              <rect x="10" y="75" width="15" height="15" fill="#ffffff" />
              <rect x="13" y="78" width="9" height="9" fill="#1e293b" />

              <rect x="40" y="10" width="10" height="20" fill="#1e293b" />
              <rect x="40" y="40" width="20" height="20" fill="#6366f1" rx="4" />
              <rect x="70" y="40" width="15" height="10" fill="#1e293b" />
              <rect x="40" y="70" width="20" height="15" fill="#1e293b" />
              <rect x="70" y="70" width="20" height="20" fill="#1e293b" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
                <Globe2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>실시간 브로드캐스트 대기 중 (Room: {roomId})</span>
          </div>
        </div>

        {/* Target Audience Language Selection */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            청중 기본 수신 언어 선택:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedAudienceLang(lang.speechCode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  selectedAudienceLang === lang.speechCode
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{lang.flag}</span>
                <span className="truncate">{lang.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Share Link Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={roomUrl}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 font-mono outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? '복사됨!' : '링크 복사'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
