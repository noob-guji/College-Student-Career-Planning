/**
 * InterviewerTTS — Client-side TTS service using the /api/tts endpoint.
 *
 * This replaces the text-driven lip-sync approach (NaturalTTS + chineseVisemes)
 * with audio-synchronized viseme animation via TalkingHead's native speakAudio().
 *
 * On failure, callers should fall back to NaturalTTS + chineseVisemes.
 */

import type { EmotionType, VoiceGender } from './naturalTTS';

// ---- Types ----

interface TTSResponse {
  audioBase64: string;
  visemes: string[];
  vtimes: number[];
  vdurations: number[];
  totalDurationMs: number;
}

interface SpeakOptions {
  emotion?: EmotionType;
  gender?: VoiceGender;
}

// ---- Voice config for edge-tts ----

const VOICE_BY_GENDER: Record<string, string> = {
  male: 'zh-CN-YunxiNeural',
  female: 'zh-CN-XiaoxiaoNeural',
};

// ----

export class InterviewerTTS {
  private head: any; // TalkingHead instance
  private onSpeakingChange?: (speaking: boolean) => void;
  private abortController: AbortController | null = null;
  private speakEndTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(head: any, onSpeakingChange?: (speaking: boolean) => void) {
    this.head = head;
    this.onSpeakingChange = onSpeakingChange;
  }

  /**
   * Speak the given text using the Edge TTS API + TalkingHead lip-sync.
   *
   * Returns `true` if the API path succeeded, `false` if the caller should
   * fall back to browser TTS (NaturalTTS).
   */
  async speak(text: string, options?: SpeakOptions): Promise<boolean> {
    // Guard: need audio context
    if (!this.head?.audioCtx || this.head.audioCtx.state === 'closed') {
      console.warn('[InterviewerTTS] AudioContext not available, skipping');
      return false;
    }

    // Cancel any previous speech
    this.cancel();

    // Create new abort controller
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Ensure AudioContext is running (browser autoplay policy)
      if (this.head.audioCtx.state === 'suspended') {
        await this.head.audioCtx.resume();
      }

      const voice = VOICE_BY_GENDER[options?.gender || 'female'] || VOICE_BY_GENDER.female;

      this.onSpeakingChange?.(true);

      // ---- Call the API ----
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice,
          emotion: options?.emotion || 'neutral',
          gender: options?.gender || 'female',
        }),
        signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        console.warn(`[InterviewerTTS] API error (${response.status}):`, err.error);
        return false;
      }

      const data: TTSResponse = await response.json();

      if (signal.aborted) return false;

      // ---- Decode audio ----
      const audioBuffer = await this.decodeBase64Audio(data.audioBase64, signal);
      if (!audioBuffer) return false;

      if (signal.aborted) return false;

      // ---- Feed to TalkingHead ----
      this.head.speakAudio(
        {
          audio: audioBuffer,
          visemes: data.visemes,
          vtimes: data.vtimes,
          vdurations: data.vdurations,
        },
        { isRaw: false }
      );

      // ---- Wait for speech to end ----
      await this.waitForSpeechEnd(data.totalDurationMs);

      this.onSpeakingChange?.(false);
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Cancelled intentionally
        return false;
      }
      console.warn('[InterviewerTTS] Failed:', err.message || err);
      this.onSpeakingChange?.(false);
      return false;
    }
  }

  /**
   * Decode base64-encoded MP3 audio into an AudioBuffer using the TalkingHead's
   * own AudioContext (required for buffer compatibility).
   */
  private async decodeBase64Audio(
    base64: string,
    signal: AbortSignal
  ): Promise<AudioBuffer | null> {
    try {
      // base64 → ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode MP3 → AudioBuffer via TalkingHead's AudioContext
      const audioBuffer = await this.head.audioCtx.decodeAudioData(bytes.buffer);

      if (signal.aborted) return null;

      return audioBuffer;
    } catch (err: any) {
      console.warn('[InterviewerTTS] Audio decode failed:', err.message || err);
      return null;
    }
  }

  /**
   * Wait for TalkingHead to finish speaking.
   *
   * Uses a combination of a duration-based timer and polling of
   * head.isSpeaking / head.isAudioPlaying for robustness.
   */
  private async waitForSpeechEnd(totalDurationMs: number): Promise<void> {
    // Start checking shortly before the expected end time
    const checkStartMs = Math.max(0, totalDurationMs - 500);

    return new Promise((resolve) => {
      const check = () => {
        const head = this.head;
        if (!head) {
          resolve();
          return;
        }

        // Check if TalkingHead is still busy
        const stillSpeaking = head.isSpeaking || head.isAudioPlaying;

        if (!stillSpeaking) {
          resolve();
        } else {
          this.speakEndTimer = setTimeout(check, 150);
        }
      };

      // Begin checking near the expected end
      this.speakEndTimer = setTimeout(check, checkStartMs);
    });
  }

  /**
   * Cancel any ongoing speech (API call + TalkingHead playback).
   */
  cancel(): void {
    // Abort in-flight fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear the end-check timer
    if (this.speakEndTimer) {
      clearTimeout(this.speakEndTimer);
      this.speakEndTimer = null;
    }

    // Stop TalkingHead audio + animation
    if (this.head) {
      try {
        this.head.speakBreak(0);
      } catch {
        // TalkingHead may not be fully initialized
      }
    }

    this.onSpeakingChange?.(false);
  }
}
