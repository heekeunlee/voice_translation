import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  Globe2,
  Radio,
  ExternalLink,
  Info,
  RefreshCw,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants';
import { buildAudienceUrl } from '../services/broadcast';

interface AudienceRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  /** True while the presenter's mic is running, i.e. subtitles are flowing. */
  isBroadcasting: boolean;
  onRegenerateRoom: () => void;
}

export const AudienceRoomModal: React.FC<AudienceRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  isBroadcasting,
  onRegenerateRoom,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [selectedAudienceLang, setSelectedAudienceLang] = useState('en-US');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const roomUrl = buildAudienceUrl(roomId, selectedAudienceLang);

  // Render a real, scannable QR for the actual link (the previous version drew
  // decorative rectangles that no scanner could read).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    QRCode.toDataURL(roomUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1e293b', light: '#ffffff' },
    })
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(err => { console.warn('QR generation failed:', err); });
    return () => { cancelled = true; };
  }, [isOpen, roomUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5 pr-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              청중 자막 화면 공유
            </h2>
            <p className="text-xs text-gray-500">
              발표자의 음성을 다른 창에서 큰 자막으로 띄웁니다. 청중은 원하는 언어를 직접 고를 수 있습니다.
            </p>
          </div>
        </div>

        {/* Scope disclosure — this is the honest limit of a serverless build. */}
        <div className="flex items-start gap-2 rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 mb-5 text-[12px] leading-relaxed text-sky-900">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
          <p>
            <span className="font-bold">같은 브라우저 안에서만 연결됩니다.</span>{' '}
            새 탭이나 새 창으로 열어 보조 모니터·프로젝터에 띄우는 용도입니다. 자막은 기기 밖으로 전송되지 않아 별도 서버나 계정이 필요 없지만,{' '}
            <span className="font-semibold">다른 기기(휴대폰)에서는 열리지 않습니다.</span>
          </p>
        </div>

        {/* QR + status */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 border border-gray-200 mb-5">
          <div className="relative p-3 bg-white rounded-2xl shadow-md border border-gray-200 mb-3">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`청중 화면 링크 QR 코드 (Room ${roomId})`}
                className="w-40 h-40"
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-xs text-gray-400">
                QR 생성 중…
              </div>
            )}
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs font-bold ${
              isBroadcasting ? 'text-emerald-700' : 'text-gray-500'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-pulse' : ''}`} />
            <span>
              {isBroadcasting ? '자막 송출 중' : '대기 중 — 마이크를 켜면 송출됩니다'} (Room: {roomId})
            </span>
          </div>

          <button
            onClick={onRegenerateRoom}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition"
            title="새 방 번호를 만들면 기존 링크는 더 이상 수신되지 않습니다"
          >
            <RefreshCw className="w-3 h-3" />
            방 번호 새로 만들기
          </button>
        </div>

        {/* Audience language */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            링크에 담을 기본 수신 언어
          </label>
          <p className="text-[11px] text-gray-500 mb-2">
            청중 화면에서 언제든 바꿀 수 있습니다. 발표자의 번역 언어와 다르면 청중 화면이 원문을 직접 번역합니다.
          </p>
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

        {/* Share link */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={roomUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 font-mono outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition shrink-0"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? '복사됨' : '복사'}</span>
          </button>
          <a
            href={roomUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span>새 창으로 열기</span>
          </a>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
          <Globe2 className="w-3 h-3" />
          링크를 연 창은 이 방의 자막을 계속 수신합니다.
        </p>
      </div>
    </div>
  );
};
