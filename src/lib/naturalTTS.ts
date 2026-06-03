type EmotionType = 'neutral' | 'encouraging' | 'satisfied' | 'disappointed' | 'critical';
export type VoiceGender = 'male' | 'female';

interface SpeechSegment {
  text: string;
  pauseAfter: number;
  isQuestion: boolean;
  isEmphasis: boolean;
  isClauseStart: boolean;
}

interface ProsodyProfile {
  baseRate: number;
  basePitch: number;
  rateVariation: number;
  pitchVariation: number;
  questionPitchRise: number;
  emphasisRate: number;
  emphasisPitch: number;
  clauseStartPitch: number;
}

const MALE_PROSODY: Record<EmotionType, ProsodyProfile> = {
  neutral: {
    baseRate: 0.95,
    basePitch: 0.95,
    rateVariation: 0.02,
    pitchVariation: 0.03,
    questionPitchRise: 0.1,
    emphasisRate: 0.9,
    emphasisPitch: 1.06,
    clauseStartPitch: 1.03,
  },
  encouraging: {
    baseRate: 0.97,
    basePitch: 1.02,
    rateVariation: 0.03,
    pitchVariation: 0.04,
    questionPitchRise: 0.12,
    emphasisRate: 0.92,
    emphasisPitch: 1.1,
    clauseStartPitch: 1.05,
  },
  satisfied: {
    baseRate: 0.94,
    basePitch: 0.98,
    rateVariation: 0.02,
    pitchVariation: 0.03,
    questionPitchRise: 0.1,
    emphasisRate: 0.9,
    emphasisPitch: 1.08,
    clauseStartPitch: 1.03,
  },
  disappointed: {
    baseRate: 0.88,
    basePitch: 0.88,
    rateVariation: 0.02,
    pitchVariation: 0.02,
    questionPitchRise: 0.06,
    emphasisRate: 0.85,
    emphasisPitch: 0.92,
    clauseStartPitch: 0.96,
  },
  critical: {
    baseRate: 0.9,
    basePitch: 0.9,
    rateVariation: 0.02,
    pitchVariation: 0.025,
    questionPitchRise: 0.08,
    emphasisRate: 0.86,
    emphasisPitch: 0.95,
    clauseStartPitch: 0.97,
  },
};

const FEMALE_PROSODY: Record<EmotionType, ProsodyProfile> = {
  neutral: {
    baseRate: 0.96,
    basePitch: 1.12,
    rateVariation: 0.02,
    pitchVariation: 0.035,
    questionPitchRise: 0.12,
    emphasisRate: 0.92,
    emphasisPitch: 1.08,
    clauseStartPitch: 1.04,
  },
  encouraging: {
    baseRate: 0.98,
    basePitch: 1.18,
    rateVariation: 0.03,
    pitchVariation: 0.045,
    questionPitchRise: 0.14,
    emphasisRate: 0.94,
    emphasisPitch: 1.12,
    clauseStartPitch: 1.06,
  },
  satisfied: {
    baseRate: 0.95,
    basePitch: 1.14,
    rateVariation: 0.025,
    pitchVariation: 0.035,
    questionPitchRise: 0.12,
    emphasisRate: 0.92,
    emphasisPitch: 1.1,
    clauseStartPitch: 1.04,
  },
  disappointed: {
    baseRate: 0.89,
    basePitch: 1.0,
    rateVariation: 0.02,
    pitchVariation: 0.025,
    questionPitchRise: 0.08,
    emphasisRate: 0.87,
    emphasisPitch: 0.96,
    clauseStartPitch: 0.98,
  },
  critical: {
    baseRate: 0.91,
    basePitch: 1.02,
    rateVariation: 0.02,
    pitchVariation: 0.03,
    questionPitchRise: 0.1,
    emphasisRate: 0.88,
    emphasisPitch: 0.98,
    clauseStartPitch: 0.99,
  },
};

const INTERVIEWER_PROSODY: Record<VoiceGender, Record<EmotionType, ProsodyProfile>> = {
  male: MALE_PROSODY,
  female: FEMALE_PROSODY,
};

const MALE_VOICE_PATTERNS = [
  /yunyi/i,        // 云逸 — 微软男声
  // /yunyang/i,      // 云扬 — 微软男声
  // /yunjian/i,      // 云健 — 微软男声
  // /yunye/i,        // 云野 — 微软男声
  // /yunfeng/i,      // 云枫 — 微软男声（部分版本）
  // /yunyi/i,        // 云逸 — 微软男声
  // /kangkang/i,     // 康康 — 微软男声
  // /david/i,
  // /mark/i,
  // /james/i,
  // /male/i,         // 通用兜底：含 "male" 关键词
  // /\bman\b/i,      // 通用兜底：含 "man" 关键词
];

const FEMALE_VOICE_PATTERNS = [
  /huihui/i,       // 慧慧 — 微软女声
  // /xiaoxiao/i,     // 晓晓
  // /yunxi/i,        // 云希 — 微软女声（从男声修正移入）
  // /xiaoyi/i,       // 晓伊
  // /xiaohan/i,      // 晓涵
  // /yunxia/i,       // 云夏 — 微软女声
  // /zhichu/i,
  // /yaoyao/i,
  // /lili/i,
  // /tingting/i,     // macOS Ting-Ting
  // /female/i,       // 通用兜底：含 "female" 关键词
  // /\bwoman\b/i,    // 通用兜底：含 "woman" 关键词
];

const PAUSE_DURATIONS: Record<string, number> = {
  '。': 60,
  '！': 50,
  '？': 50,
  '；': 40,
  '：': 30,
  '，': 20,
  '、': 10,
  '—': 40,
  '…': 70,
};

const CLAUSE_STARTERS = [
  /^(那么|所以|因此|但是|不过|然而|而且|此外|另外|同时|首先|其次|最后|总之|综上|换句话说|也就是说|具体来说|一般来说|实际上|事实上|其实|当然|显然|显然地|毋庸置疑)/,
];

const EMPHASIS_PATTERNS = [
  /最[大重要关键核心]*/,
  /特别/,
  /非常/,
  /极其/,
  /务必/,
  /一定/,
  /关键/,
  /核心/,
  /重点/,
  /注意/,
  /切记/,
  /必须/,
  /务必/,
];

function detectEmphasis(text: string): boolean {
  return EMPHASIS_PATTERNS.some(p => p.test(text));
}

function detectQuestion(text: string): boolean {
  const trimmed = text.trimEnd();
  if (/[？?]$/.test(trimmed)) return true;
  if (/[吗呢吧啊嘛呀]$/.test(trimmed) && !/[。！；]$/.test(trimmed)) return true;
  if (/^(是不是|有没有|能不能|会不会|为什么|怎么|如何|哪些|什么|哪个|几|多少|是否)/.test(trimmed)) return true;
  return false;
}

function detectClauseStart(text: string): boolean {
  return CLAUSE_STARTERS.some(p => p.test(text.trim()));
}

function segmentText(text: string): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  const pattern = /([^。！？!?]+[。！？!?]*)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;

    let pauseAfter = 0;
    for (const [punct, duration] of Object.entries(PAUSE_DURATIONS)) {
      if (raw.endsWith(punct)) {
        pauseAfter = duration;
        break;
      }
    }

    const isQuestion = detectQuestion(raw);
    const isEmphasis = detectEmphasis(raw);
    const isClauseStart = detectClauseStart(raw);

    segments.push({
      text: raw,
      pauseAfter,
      isQuestion,
      isEmphasis,
      isClauseStart,
    });
  }

  if (segments.length === 0 && text.trim()) {
    segments.push({
      text: text.trim(),
      pauseAfter: 0,
      isQuestion: detectQuestion(text),
      isEmphasis: detectEmphasis(text),
      isClauseStart: detectClauseStart(text),
    });
  }

  return segments;
}

function estimateDurationMs(text: string, rate: number): number {
  const charCount = text.length;
  const charsPerSecond = 5.0 * rate;
  return Math.max(1500, (charCount / charsPerSecond) * 1000 + 1000);
}

export interface NaturalTTSOptions {
  emotion?: EmotionType;
  gender?: VoiceGender;
  onSpeakingChange?: (speaking: boolean) => void;
  onSegmentStart?: (index: number, total: number) => void;
  /** Called when speak() is invoked with the full text — enables external lip-sync */
  onSpeak?: (text: string) => void;
}

export class NaturalTTS {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  /** 选中的语音是否与当前性别匹配（原生同性别语音 → true；跨性别 fallback → false） */
  private voiceGenderMatched = false;
  private isSpeakingFlag = false;
  private cancelFlag = false;
  private onSpeakingChange?: (speaking: boolean) => void;
  private onSegmentStart?: (index: number, total: number) => void;
  private onSpeak?: (text: string) => void;
  private currentEmotion: EmotionType = 'neutral';
  private currentGender: VoiceGender = 'male';
  private chromeKeepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: NaturalTTSOptions) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.onSpeakingChange = options?.onSpeakingChange;
      this.onSegmentStart = options?.onSegmentStart;
      this.onSpeak = options?.onSpeak;
      this.currentGender = options?.gender || 'male';
      this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synth) return;

    const loadAndSelect = () => {
      this.voices = this.synth!.getVoices();
      this.selectBestVoice();
    };

    loadAndSelect();
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = loadAndSelect;
    }
  }

  private selectBestVoice() {
    const zhVoices = this.voices.filter(v => v.lang.startsWith('zh'));

    if (zhVoices.length === 0) {
      this.preferredVoice = null;
      this.voiceGenderMatched = false;
      console.warn('[NaturalTTS] 系统中未找到任何中文语音（zh-*）');
      return;
    }

    const zhVoiceNames = zhVoices.map(v => `"${v.name}" (${v.lang})`).join(', ');
    console.log(`[NaturalTTS] 可用中文语音: ${zhVoiceNames}`);

    const patterns = this.currentGender === 'male' ? MALE_VOICE_PATTERNS : FEMALE_VOICE_PATTERNS;

    // 第一轮：精确匹配 gender-specific 语音名称
    for (const pattern of patterns) {
      const found = zhVoices.find(v => pattern.test(v.name));
      if (found) {
        this.preferredVoice = found;
        this.voiceGenderMatched = true;
        console.log(`[NaturalTTS] ✅ 匹配到${this.currentGender === 'male' ? '男' : '女'}声: "${found.name}"`);
        return;
      }
    }

    // 第二轮：zh-CN 中按当前性别筛选 — 排除异性关键词
    const cnVoices = zhVoices.filter(v => v.lang === 'zh-CN');
    const oppositePatterns = this.currentGender === 'male' ? FEMALE_VOICE_PATTERNS : MALE_VOICE_PATTERNS;

    const genderFiltered = cnVoices.filter(v => !oppositePatterns.some(p => p.test(v.name)));
    if (genderFiltered.length > 0) {
      this.preferredVoice = genderFiltered[0];
      this.voiceGenderMatched = true;
      console.log(`[NaturalTTS] ⚠️ 第二轮匹配: "${genderFiltered[0].name}"（排除异性语音后）`);
      return;
    }

    // 第三轮：所有 zh 方言中排除异性关键词
    const allGenderFiltered = zhVoices.filter(v => !oppositePatterns.some(p => p.test(v.name)));
    if (allGenderFiltered.length > 0) {
      this.preferredVoice = allGenderFiltered[0];
      this.voiceGenderMatched = true;
      console.log(`[NaturalTTS] ⚠️ 第三轮匹配: "${allGenderFiltered[0].name}"`);
      return;
    }

    // 最终兜底：没有原生对应性别语音，使用第一个中文语音 + 音高补偿
    this.preferredVoice = cnVoices.length > 0 ? cnVoices[0] : zhVoices[0];
    this.voiceGenderMatched = false;
    console.warn(
      `[NaturalTTS] 🔄 未找到原生${this.currentGender === 'male' ? '男' : '女'}声，使用 "${this.preferredVoice.name}" 并通过音高补偿模拟`
    );
  }

  private setSpeaking(value: boolean) {
    this.isSpeakingFlag = value;
    this.onSpeakingChange?.(value);
  }

  private startChromeKeepAlive() {
    this.stopChromeKeepAlive();
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    if (!isChrome || !this.synth) return;

    this.chromeKeepAliveTimer = setInterval(() => {
      if (this.synth && this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private stopChromeKeepAlive() {
    if (this.chromeKeepAliveTimer) {
      clearInterval(this.chromeKeepAliveTimer);
      this.chromeKeepAliveTimer = null;
    }
  }

  async speak(text: string, emotion?: EmotionType): Promise<void> {
    if (!this.synth) return;

    this.cancel();
    this.cancelFlag = false;
    this.currentEmotion = emotion || 'neutral';

    const segments = segmentText(text);
    if (segments.length === 0) return;

    // Notify lip-sync listener of the text being spoken
    this.onSpeak?.(text);

    this.setSpeaking(true);
    this.startChromeKeepAlive();

    try {
      for (let i = 0; i < segments.length; i++) {
        if (this.cancelFlag) break;

        this.onSegmentStart?.(i, segments.length);
        await this.speakSegment(segments[i], i, segments.length);

        if (this.cancelFlag) break;

        if (i < segments.length - 1) {
          await this.pause(segments[i].pauseAfter);
        }
      }
    } catch {
      // cancelled
    } finally {
      this.stopChromeKeepAlive();
      this.setSpeaking(false);
    }
  }

  private speakSegment(segment: SpeechSegment, index: number, total: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth || this.cancelFlag) {
        reject('cancelled');
        return;
      }

      const prosody = INTERVIEWER_PROSODY[this.currentGender][this.currentEmotion];

      let rate = prosody.baseRate;
      let pitch = prosody.basePitch;

      if (total > 1) {
        const progress = index / (total - 1);
        const midPoint = 0.5;
        const rateCurve = 1 - 2 * Math.abs(progress - midPoint);
        const pitchCurve = Math.sin(progress * Math.PI);
        rate += rateCurve * prosody.rateVariation;
        pitch += pitchCurve * prosody.pitchVariation;
      }

      if (segment.isClauseStart) {
        pitch *= prosody.clauseStartPitch;
      }

      if (segment.isQuestion) {
        pitch += prosody.questionPitchRise;
        rate *= 1.01;
      }

      if (segment.isEmphasis) {
        rate *= prosody.emphasisRate;
        pitch *= prosody.emphasisPitch;
      }

      rate = Math.max(0.5, Math.min(2.0, rate));
      pitch = Math.max(0.5, Math.min(2.0, pitch));

      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.lang = 'zh-CN';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve();
        }
      };
      const safeReject = (reason: string) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          reject(reason);
        }
      };

      const timeoutMs = estimateDurationMs(segment.text, rate);
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          try { this.synth!.cancel(); } catch {}
          safeResolve();
        }
      }, timeoutMs);

      utterance.onend = safeResolve;
      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') {
          safeReject('cancelled');
        } else {
          safeResolve();
        }
      };

      this.synth.speak(utterance);
    });
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      const check = () => {
        if (this.cancelFlag) {
          clearTimeout(timer);
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }

  cancel() {
    this.cancelFlag = true;
    this.stopChromeKeepAlive();
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.isSpeakingFlag) {
      this.setSpeaking(false);
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeakingFlag;
  }

  getVoiceName(): string {
    return this.preferredVoice?.name || 'default';
  }

  getAvailableVoices(): string[] {
    return this.voices
      .filter(v => v.lang.startsWith('zh'))
      .map(v => v.name);
  }

  setGender(gender: VoiceGender) {
    this.currentGender = gender;
    this.selectBestVoice();
  }

  getGender(): VoiceGender {
    return this.currentGender;
  }
}

export function emotionFromScore(score: number): EmotionType {
  if (score >= 9) return 'encouraging';
  if (score >= 7) return 'satisfied';
  if (score >= 5) return 'neutral';
  if (score >= 3) return 'disappointed';
  return 'critical';
}
