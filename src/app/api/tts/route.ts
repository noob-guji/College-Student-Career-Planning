/**
 * TTS API Route — Server-side speech synthesis with viseme generation.
 *
 * Uses Microsoft Edge's free neural TTS service (via edge-tts-universal)
 * to generate high-quality Chinese speech and word-level timing metadata,
 * then computes Oculus-compatible viseme sequences for TalkingHead lip-sync.
 *
 * POST /api/tts
 * Body: { text: string, voice?: string, rate?: string, pitch?: string }
 * Response: { audioBase64: string, visemes: string[], vtimes: number[], vdurations: number[], totalDurationMs: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import {
  wordBoundariesToVisemes,
  getTotalDurationMs,
  type WordBoundary,
} from './visemeService';

// ---- Voice configuration ----

/** Default Chinese voices by gender */
const VOICE_BY_GENDER: Record<string, string> = {
  male: 'zh-CN-YunxiNeural', // 云希 — warm male
  female: 'zh-CN-XiaoxiaoNeural', // 晓晓 — warm female
};

/** Prosody presets by emotion (rate/pitch adjustments applied to edge-tts) */
const EMOTION_PROSODY: Record<string, { rate: string; pitch: string }> = {
  neutral: { rate: '+0%', pitch: '+0Hz' },
  encouraging: { rate: '+5%', pitch: '+4Hz' },
  satisfied: { rate: '+2%', pitch: '+2Hz' },
  disappointed: { rate: '-8%', pitch: '-5Hz' },
  critical: { rate: '-5%', pitch: '-4Hz' },
};

// ---- Types ----

interface TTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  emotion?: string;
  gender?: 'male' | 'female';
}

// ----

export async function POST(req: NextRequest) {
  try {
    const body: TTSRequest = await req.json();

    // Validate input
    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const text = body.text.trim();

    // Select voice
    const voice =
      body.voice ||
      VOICE_BY_GENDER[body.gender || 'female'] ||
      VOICE_BY_GENDER.female;

    // Select prosody
    const emotionKey = body.emotion && EMOTION_PROSODY[body.emotion] ? body.emotion : 'neutral';
    const prosody = EMOTION_PROSODY[emotionKey];
    const rate = body.rate || prosody.rate;
    const pitch = body.pitch || prosody.pitch;

    console.log(`[TTS API] Synthesizing ${text.length} chars with voice="${voice}" rate="${rate}" pitch="${pitch}"`);

    // Stream TTS from Microsoft Edge service
    const communicate = new Communicate(text, {
      voice,
      rate,
      pitch,
      volume: '+0%',
    });

    const audioChunks: Buffer[] = [];
    const wordBoundaries: WordBoundary[] = [];

    for await (const chunk of communicate.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        audioChunks.push(chunk.data);
      } else if (chunk.type === 'WordBoundary') {
        console.log(`[TTS API] WordBoundary: offset=${chunk.offset} dur=${chunk.duration} text="${chunk.text}"`);
        wordBoundaries.push({
          offset: chunk.offset!,
          duration: chunk.duration!,
          text: chunk.text!,
        });
      }
    }

    if (audioChunks.length === 0) {
      console.error('[TTS API] No audio received from edge-tts');
      return NextResponse.json(
        { error: 'TTS service returned no audio' },
        { status: 502 }
      );
    }

    // Build response
    const audioBuffer = Buffer.concat(audioChunks);
    const audioBase64 = audioBuffer.toString('base64');

    // Fix WordBoundary text encoding: in some environments the WebSocket
    // metadata text may be garbled (Next.js bundler can affect UTF-8 decoding).
    // If no boundary contains CJK characters, redistribute original text.
    const hasCJK = wordBoundaries.some(wb =>
      Array.from(wb.text).some(ch => {
        const cp = ch.codePointAt(0)!;
        return (cp >= 0x4E00 && cp <= 0x9FFF);
      })
    );

    if (!hasCJK && wordBoundaries.length > 0) {
      const cjkChars = Array.from(text).filter(ch => {
        const cp = ch.codePointAt(0)!;
        return (cp >= 0x4E00 && cp <= 0x9FFF);
      });

      if (cjkChars.length > 0) {
        const charsPerSlot = Math.max(1, Math.floor(cjkChars.length / wordBoundaries.length));
        let charIdx = 0;
        for (let i = 0; i < wordBoundaries.length && charIdx < cjkChars.length; i++) {
          const count = i === wordBoundaries.length - 1
            ? cjkChars.length - charIdx
            : charsPerSlot;
          wordBoundaries[i].text = cjkChars.slice(charIdx, charIdx + count).join('');
          charIdx += count;
        }
        console.log(`[TTS API] Fixed WordBoundary text encoding (${cjkChars.length} chars in ${wordBoundaries.length} slots)`);
      }
    }

    // Generate viseme timeline from WordBoundary events
    console.log(`[TTS API] Raw boundaries count: ${wordBoundaries.length}`);
    const timeline = wordBoundariesToVisemes(wordBoundaries);
    const totalDurationMs = getTotalDurationMs(wordBoundaries);

    console.log(
      `[TTS API] Success: audio=${audioBuffer.length}B (base64=${audioBase64.length}chars), ` +
      `visemes=${timeline.visemes.length}, duration=${Math.round(totalDurationMs)}ms, ` +
      `words=${wordBoundaries.length}`
    );

    return NextResponse.json({
      audioBase64,
      visemes: timeline.visemes,
      vtimes: timeline.vtimes,
      vdurations: timeline.vdurations,
      totalDurationMs: Math.round(totalDurationMs),
    });
  } catch (error: any) {
    console.error('[TTS API] Error:', error);

    // Distinguish known edge-tts errors
    const message = error?.message || String(error);
    if (message.includes('WebSocket') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'TTS service connection failed' },
        { status: 502 }
      );
    }

    if (message.includes('NoAudioReceived')) {
      return NextResponse.json(
        { error: 'TTS service returned no audio' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
