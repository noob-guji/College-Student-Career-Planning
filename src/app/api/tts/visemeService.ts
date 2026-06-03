/**
 * Server-side viseme generation from WordBoundary events.
 *
 * Uses pinyin-pro (full 27,000+ character dictionary) for accurate
 * Chinese → pinyin conversion, then maps to Oculus viseme codes using
 * the same phoneme tables as the client-side chineseVisemes.ts.
 *
 * This module runs ONLY in the Node.js API route, never in the browser.
 */

import { pinyin } from 'pinyin-pro';
import {
  INITIAL_TO_VISEME,
  FINAL_TO_VISEME,
  parseSyllable,
  type VisemeCode,
} from '@/lib/chineseVisemes';

// ---- Types ----

export interface WordBoundary {
  /** Word start time in 100-nanosecond units (from edge-tts) */
  offset: number;
  /** Word duration in 100-nanosecond units (from edge-tts) */
  duration: number;
  /** The spoken word text */
  text: string;
}

export interface VisemeTimeline {
  /** Oculus viseme codes (aa, E, I, O, U, PP, FF, SS, CH, kk, nn, RR, DD, TH, sil) */
  visemes: string[];
  /** Start time of each viseme in milliseconds (relative to audio start) */
  vtimes: number[];
  /** Duration of each viseme in milliseconds */
  vdurations: number[];
}

// 100-nanosecond units → milliseconds
const TICK_TO_MS = 1 / 10000;

/** Characters that should produce silence */
const SILENT_CHARS = new Set([' ', '\t', '\r', '\n', '~', '·']);

/** Detect if a character is CJK */
function isCJK(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility
    (cp >= 0x2f800 && cp <= 0x2fa1f) // CJK Compatibility Supplement
  );
}

/** Chinese punctuation that should insert a brief silence gap */
const PUNCTUATION_PAUSE_CHARS = new Set([
  '。', '！', '？', '；', '…', '，', '、', '：', '—',
  '.', '!', '?', ';', ',', ':',
]);

/**
 * Convert a single Chinese character to its viseme sequence.
 * Returns 0-2 visemes: consonant viseme (from initial) + vowel viseme (from final).
 */
function charToVisemes(char: string): VisemeCode[] {
  if (!isCJK(char)) return [];

  let py: string;
  try {
    py = pinyin(char, { toneType: 'none', type: 'string' });
  } catch (err) {
    console.warn(`[visemeService] pinyin('${char}') failed:`, err);
    return ['E'];
  }

  if (!py) return [];

  // Handle multi-syllable characters (rare: 瓩 → "qianwa") → take first syllable
  const firstSyllable = py.split(' ')[0];

  const { initial, final } = parseSyllable(firstSyllable);
  const result: VisemeCode[] = [];

  // Consonant phase
  if (initial && INITIAL_TO_VISEME[initial]) {
    result.push(INITIAL_TO_VISEME[initial]);
  }

  // Vowel phase
  if (final && FINAL_TO_VISEME[final]) {
    result.push(FINAL_TO_VISEME[final]);
  } else if (final) {
    // Unknown final → neutral open mouth
    result.push('E');
  }

  // Fallback: no visemes at all → neutral
  if (result.length === 0) {
    result.push('E');
  }

  return result;
}

/**
 * Convert edge-tts WordBoundary events into a viseme timeline suitable
 * for TalkingHead's `speakAudio()` method.
 *
 * Each word's time window is divided among its characters. Within each
 * character, the consonant viseme gets ~25% of the char's duration and
 * the vowel viseme gets ~65% (10% gap for natural transition).
 *
 * @param boundaries - WordBoundary events from edge-tts stream
 * @returns Viseme arrays aligned with audio playback
 */
export function wordBoundariesToVisemes(boundaries: WordBoundary[]): VisemeTimeline {
  const visemes: string[] = [];
  const vtimes: number[] = [];
  const vdurations: number[] = [];

  for (const wb of boundaries) {
    const wordStartMs = wb.offset * TICK_TO_MS;
    const wordDurationMs = wb.duration * TICK_TO_MS;
    const chars = Array.from(wb.text);

    // Filter to only CJK characters (skip punctuation embedded in words)
    const cjkChars = chars.filter(isCJK);
    const punctChars = chars.filter(c => PUNCTUATION_PAUSE_CHARS.has(c));

    if (cjkChars.length === 0 && punctChars.length > 0) {
      // Pure punctuation → insert silence
      visemes.push('sil');
      vtimes.push(wordStartMs);
      vdurations.push(wordDurationMs);
      continue;
    }

    if (cjkChars.length === 0) {
      // No speakable content
      continue;
    }

    // Distribute word duration evenly among CJK characters
    const msPerChar = wordDurationMs / cjkChars.length;
    // Reserve 10% for inter-character transitions
    const charActiveMs = msPerChar * 0.9;
    const charGapMs = msPerChar * 0.1;
    const consonantFraction = 0.25;
    const vowelFraction = 0.65;

    for (let ci = 0; ci < cjkChars.length; ci++) {
      const charStartMs = wordStartMs + ci * msPerChar;
      const charVisemes = charToVisemes(cjkChars[ci]);

      if (charVisemes.length === 0) {
        // Unknown — brief neutral
        visemes.push('E');
        vtimes.push(charStartMs);
        vdurations.push(charActiveMs * 0.5);
        continue;
      }

      if (charVisemes.length === 1) {
        // Only vowel (no initial consonant)
        visemes.push(charVisemes[0]);
        vtimes.push(charStartMs);
        vdurations.push(charActiveMs);
      } else {
        // Consonant + vowel
        const consDuration = charActiveMs * consonantFraction;
        const vowelDuration = charActiveMs * vowelFraction;

        // Consonant viseme
        visemes.push(charVisemes[0]);
        vtimes.push(charStartMs);
        vdurations.push(consDuration);

        // Vowel viseme
        visemes.push(charVisemes[1]);
        vtimes.push(charStartMs + consDuration);
        vdurations.push(vowelDuration);
      }
    }

    // If the word ends with CJK punctuation, add brief silence
    if (punctChars.length > 0) {
      const punctMs = Math.min(wordDurationMs * 0.15, 150);
      visemes.push('sil');
      vtimes.push(wordStartMs + wordDurationMs - punctMs);
      vdurations.push(punctMs);
    }
  }

  // Deduplicate consecutive identical visemes (merge them)
  const mergedVisemes: string[] = [];
  const mergedTimes: number[] = [];
  const mergedDurations: number[] = [];

  for (let i = 0; i < visemes.length; i++) {
    if (
      mergedVisemes.length > 0 &&
      mergedVisemes[mergedVisemes.length - 1] === visemes[i]
    ) {
      // Extend the previous viseme's duration
      const prevEnd = mergedTimes[mergedTimes.length - 1] + mergedDurations[mergedDurations.length - 1];
      const currEnd = vtimes[i] + vdurations[i];
      mergedDurations[mergedDurations.length - 1] = currEnd - mergedTimes[mergedTimes.length - 1];
    } else {
      mergedVisemes.push(visemes[i]);
      mergedTimes.push(vtimes[i]);
      mergedDurations.push(vdurations[i]);
    }
  }

  return {
    visemes: mergedVisemes,
    vtimes: mergedTimes,
    vdurations: mergedDurations,
  };
}

/**
 * Estimate total audio duration from WordBoundary events in milliseconds.
 */
export function getTotalDurationMs(boundaries: WordBoundary[]): number {
  if (boundaries.length === 0) return 0;
  const last = boundaries[boundaries.length - 1];
  return (last.offset + last.duration) * TICK_TO_MS;
}
