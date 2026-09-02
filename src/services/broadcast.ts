/**
 * Live subtitle broadcast between the presenter view and audience views.
 *
 * Transport is `BroadcastChannel`, which reaches every tab and window of the
 * same origin in the same browser profile — a presenter window plus an audience
 * window dragged onto a projector or second monitor. It deliberately does NOT
 * reach another device: that would require a relay server, which a static
 * GitHub Pages deployment has no way to host. Nothing leaves the browser.
 *
 * `localStorage` is used as a fallback for browsers without BroadcastChannel;
 * `storage` events fire in other tabs of the same origin and carry the payload.
 */

import type { TranslationMode } from '../types';

export const AUDIENCE_VIEW_PARAM = 'view';
export const AUDIENCE_VIEW_VALUE = 'audience';
export const ROOM_PARAM = 'room';
export const LANG_PARAM = 'lang';

const CHANNEL_PREFIX = 'fluentlive_room_';
/** Storage key used only by the localStorage fallback path. */
const FALLBACK_KEY_PREFIX = 'fluentlive_bc_';

export interface SubtitlePayload {
  kind: 'subtitle';
  /** Recognised speech, in the presenter's source language. */
  sourceText: string;
  /** The presenter's own translation. */
  translatedText: string;
  sourceLang: string;
  /** Language `translatedText` is written in. */
  targetLang: string;
  mode: TranslationMode;
  /** True while this is a speculative (pre-final) translation. */
  isProvisional: boolean;
  sentAt: number;
}

export interface PresencePayload {
  kind: 'presence';
  /** 'live' while the presenter is broadcasting, 'idle' when they stop. */
  state: 'live' | 'idle';
  sentAt: number;
}

export type BroadcastMessage = SubtitlePayload | PresencePayload;

/** Room ids are user-visible (they appear in the share link), so keep them readable. */
export function createRoomId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike characters
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return `${body.slice(0, 3)}-${body.slice(3)}`;
}

export function isValidRoomId(value: string | null): value is string {
  return !!value && /^[a-z0-9]{3}-[a-z0-9]{3}$/.test(value);
}

/**
 * Build the audience URL. Uses `import.meta.env.BASE_URL` because the app is
 * served from a sub-path on GitHub Pages (`/voice_translation/`) — building the
 * link from `location.origin` alone produced a 404.
 */
export function buildAudienceUrl(roomId: string, lang: string): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  base.searchParams.set(ROOM_PARAM, roomId);
  base.searchParams.set(AUDIENCE_VIEW_PARAM, AUDIENCE_VIEW_VALUE);
  base.searchParams.set(LANG_PARAM, lang);
  return base.toString();
}

export interface AudienceRoute {
  isAudience: boolean;
  roomId: string | null;
  lang: string | null;
}

export function readAudienceRoute(search = window.location.search): AudienceRoute {
  const params = new URLSearchParams(search);
  const roomId = params.get(ROOM_PARAM);
  return {
    isAudience:
      params.get(AUDIENCE_VIEW_PARAM) === AUDIENCE_VIEW_VALUE && isValidRoomId(roomId),
    roomId: isValidRoomId(roomId) ? roomId : null,
    lang: params.get(LANG_PARAM),
  };
}

export function isBroadcastSupported(): boolean {
  return typeof window !== 'undefined' && 'BroadcastChannel' in window;
}

/**
 * A room connection. Both sides use the same object; the presenter calls
 * `post`, the audience passes an `onMessage`.
 */
export class RoomChannel {
  private channel: BroadcastChannel | null = null;
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private readonly fallbackKey: string;

  constructor(roomId: string, onMessage?: (message: BroadcastMessage) => void) {
    this.fallbackKey = `${FALLBACK_KEY_PREFIX}${roomId}`;

    if (isBroadcastSupported()) {
      this.channel = new BroadcastChannel(`${CHANNEL_PREFIX}${roomId}`);
      if (onMessage) {
        this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
          if (event.data?.kind) onMessage(event.data);
        };
      }
      return;
    }

    if (onMessage) {
      this.storageHandler = (event: StorageEvent) => {
        if (event.key !== this.fallbackKey || !event.newValue) return;
        try {
          const parsed = JSON.parse(event.newValue) as BroadcastMessage;
          if (parsed?.kind) onMessage(parsed);
        } catch {
          // Ignore malformed payloads
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
  }

  post(message: BroadcastMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
      return;
    }
    try {
      // Writing the same value twice fires no storage event, so include sentAt.
      localStorage.setItem(this.fallbackKey, JSON.stringify(message));
    } catch {
      // Quota or private-mode failures are not worth interrupting a talk for.
    }
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
  }
}
