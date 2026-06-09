'use client';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';
import {
  SpeakerLayout,
  CallControls as StreamCallControls,
  StreamTheme,
} from '@stream-io/video-react-sdk';
import { MessageSquare } from 'lucide-react';
import { InCallChat } from './InCallChat';
import { useInCallChat } from '@/hooks/shared';

interface VideoCallLayoutProps {
  call: Call;
  onEndCall: () => void;
  apiKey: string | null;
  token: string | null;
  callId: string | null;
  userId: string;
  userName: string;
  otherUserId?: string | null;
  tokenProvider?: (() => Promise<string>) | null;
}

/**
 * Siryan theme for the Stream Video widget.
 *
 * Design intent: near-black base (forest-950 = #031412) everywhere so the
 * video frames dominate. Forest green appears ONLY as an accent on active
 * interactive states. Coral is reserved for danger/end-call.
 *
 * Contrast notes (APCA-ish rough checks against #031412 base):
 *   forest-500 #3a7058  ≈ 3.6:1  — active button bg (acceptable for large UI elements)
 *   forest-400 #5a8a72  ≈ 5.1:1  — hover-on-active (good)
 *   coral-400  #c64a32  ≈ 4.8:1  — danger state (good)
 *   white      #ffffff  ≈ 18:1   — all icon/text (excellent)
 *
 * Why forest-500/400 instead of forest-600 (#235347):
 *   forest-600 on forest-950 is only ~2.4:1 — too dim to read as an accent.
 *   forest-500/400 are light enough to pop without looking neon.
 */
const streamThemeVars = {
  // ── Primary accent (active speaking ring, focus outlines) ─────────────────
  '--str-video__primary-color':    '#3a7058', // forest-500
  '--str-video__brand-color1':     '#3a7058',
  '--str-video__secondary-color':  '#5a8a72', // forest-400

  // ── Backgrounds — all forest-950 so the video frame reads as "the content" ─
  // Elevated panels get forest-900; everything else stays forest-950.
  '--str-video__background-color0': '#031412', // forest-950 (pure dark base)
  '--str-video__background-color1': '#051f20', // forest-900 (panels / sidebars)
  '--str-video__background-color2': '#051f20', // forest-900 (elevated cards)
  '--str-video__background-color3': '#051f20', // override SDK's light-gray leak
  '--str-video__background-color4': '#031412', // forest-950 (deepest wells)
  '--str-video__background-color5': '#031412', // forest-950 (controls-bar area)
  '--str-video__background-color6': '#051f20', // forest-900 (misc uses)
  '--str-video__background-color7': '#031412', // forest-950 — "enabled" button bg
                                               // (SDK uses this for cam/mic-ON state;
                                               //  keeping it near-invisible is intentional:
                                               //  "on" is the silent default, "off" turns red)

  // ── Base surface tokens ────────────────────────────────────────────────────
  '--str-video__base-color5': '#031412', // forest-950 (near-black surface)
  '--str-video__base-color6': '#051f20', // forest-900 (panel surface — reactions menu, etc.)
  '--str-video__base-color7': '#031412', // forest-950

  // ── Overlay / scrim ────────────────────────────────────────────────────────
  '--str-video__overlay-color':              'rgba(3, 20, 18, 0.82)',  // forest-950
  '--str-video__livestream-overlay-color':   'rgba(3, 20, 18, 0.25)',
  '--str-video__backdrop1':                  'rgba(3, 20, 18, 0.70)',

  // ── Default buttons (idle = near-invisible; hover = slight reveal) ─────────
  // Buttons are intentionally "invisible" at rest per the SDK's design pattern —
  // they appear as icon-only. Only hover / active states add visible colour.
  '--str-video__button-default-base':     '#031412', // forest-950 — invisible at rest
  '--str-video__button-default-hover':    '#0b2b26', // forest-800 — subtle on hover
  '--str-video__button-default-pressed':  '#031412',
  '--str-video__button-default-active':   '#051f20',
  '--str-video__button-default-disabled': '#031412',

  // ── Primary buttons (mic / camera active-highlight state) ──────────────────
  '--str-video__button-primary-base':     '#031412', // forest-950
  '--str-video__button-primary-hover':    '#5a8a72', // forest-400 — bright green hover
  '--str-video__button-primary-pressed':  '#235347', // forest-600
  '--str-video__button-primary-active':   '#3a7058', // forest-500 — clear green accent

  // ── Secondary buttons (muted / camera-off danger ring) ─────────────────────
  '--str-video__button-secondary-base':     '#031412',
  '--str-video__button-secondary-hover':    '#e0735a', // coral-300
  '--str-video__button-secondary-pressed':  '#74281a', // coral-600
  '--str-video__button-secondary-active':   '#c64a32', // coral-400

  // ── Tertiary = end-call / leave button ─────────────────────────────────────
  '--str-video__button-tertiary-base':     '#c64a32', // coral-400
  '--str-video__button-tertiary-hover':    '#e0735a', // coral-300 (lighter = brighter on hover)
  '--str-video__button-tertiary-pressed':  '#74281a', // coral-600
  '--str-video__button-tertiary-active':   '#9c3520', // coral-500

  // ── Text colours — explicit so they're always readable on forest darks ───────
  // text-color1 = primary labels (participant names, menu items)
  // text-color2 = secondary labels (captions, meta)
  // text-color3 = tertiary / placeholder
  // text-color4 = misc near-white
  '--str-video__text-color1': '#ffffff',   // pure white — maximum readability
  '--str-video__text-color2': '#c8e3d8',   // forest-100-ish — warm near-white
  '--str-video__text-color3': '#8eb69b',   // forest-300 — soft but 4:1 on forest-950
  '--str-video__text-color4': '#f0f8f4',   // near white with forest hint

  // ── Icon colours — always white on the dark surfaces ─────────────────────
  '--str-video__icon-default':  '#ffffff',
  '--str-video__icon-hover':    '#ffffff',
  '--str-video__icon-active':   '#ffffff',
  '--str-video__icon-pressed':  '#8eb69b', // forest-300 for pressed feedback
  '--str-video__icon-disabled': '#3a7058', // forest-500 — dim but on-brand

  // ── Base palette — override SDK grays to forest-tinted equivalents ─────────
  // base-color1 = near-white (used for text / active icon fill)
  // base-color2 = mid-tone (used for borders, secondary icons)
  // base-color3 = dark-mid (used for dividers, muted controls)
  '--str-video__base-color1': '#daf1de', // forest-100 (was cold gray #e3e4e5)
  '--str-video__base-color2': '#8eb69b', // forest-300 (was mid-gray #979ca0)
  '--str-video__base-color3': '#235347', // forest-600 (was dark-gray #4c535b)

  // ── Alerts / status indicators ─────────────────────────────────────────────
  '--str-video__alert-warning':            '#c64a32',
  '--str-video__alert-warning-background': 'rgba(198, 74, 50, 0.15)',
  '--str-video__alert-caution':            '#e3a73a', // amber-300
  '--str-video__alert-caution-background': 'rgba(227, 167, 58, 0.15)',
  '--str-video__alert-success':            '#3a7058', // forest-500
  '--str-video__alert-success-background': 'rgba(58, 112, 88, 0.20)',
  '--str-video__danger-color':             '#c64a32',
  '--str-video__danger-color--accent':     '#e0735a',
  '--str-video__info-color':               '#3a7058', // forest-500
  '--str-video__info-color--accent':       '#5a8a72', // forest-400
} as unknown as React.CSSProperties;

export function VideoCallLayout({
  call,
  onEndCall,
  apiKey,
  token,
  callId,
  userId,
  userName,
  otherUserId,
  tokenProvider,
}: VideoCallLayoutProps) {
  const [chatOpen, setChatOpen] = useState(false);

  const chat = useInCallChat({ apiKey, userId, userName, token, callId, otherUserId, tokenProvider });

  return (
    <StreamTheme
      as="div"
      className="flex flex-col h-full w-full overflow-hidden rounded-[var(--radius-xl)]"
      style={{ ...streamThemeVars, background: '#031412', color: '#ffffff' } as React.CSSProperties}
    >
      {/* Video area — flex-col so str-video__speaker-layout__wrapper's flex-grow:1 resolves */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <SpeakerLayout participantsBarPosition="bottom" />
        {chatOpen && (
          <InCallChat
            userId={userId}
            chat={chat}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Controls row — SDK bar + our chat toggle to the right */}
      <div className="relative flex items-center justify-center shrink-0 overflow-x-auto" style={{ background: '#031412', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <StreamCallControls onLeave={onEndCall} />
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          style={{
            background: chatOpen ? '#3a7058' : '#031412',
            color: '#ffffff',
            outline: chatOpen ? '2px solid #5a8a72' : 'none',
          }}
          aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        >
          <MessageSquare size={20} />
        </button>
      </div>
    </StreamTheme>
  );
}
