'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, RotateCcw, ArrowLeft,
  Play, Trophy, Star, AlertCircle, Loader2,
  Volume2, VolumeX, Sparkles, User,
} from 'lucide-react';
import { useInterview } from '@/hooks/useInterview';
import { INTERVIEW_GROUPS, INTERVIEW_ROLES, InterviewGroupKey } from '@/data/interviewQuestions';
import { NaturalTTS, emotionFromScore, type EmotionType, type VoiceGender } from '@/lib/naturalTTS';
import { textToVisemes, visemeToBlendShapes, type VisemeCode } from '@/lib/chineseVisemes';
import { InterviewerTTS } from '@/lib/interviewerTTS';
import Link from 'next/link';

const AVATAR_BY_GENDER: Record<VoiceGender, { url: string; body: 'M' | 'F' }[]> = {
  male: [
    { url: '/avatars/avatar_male.glb', body: 'M' },
    // { url: '/avatars/avatarsdk.glb', body: 'M' },
    // { url: '/avatars/mpfb.glb', body: 'M' },
    // { url: '/avatars/vroid.glb', body: 'M' },
  ],
  female: [
    { url: '/avatars/avatar_female.glb', body: 'F' },
  ],
};

type ReactionLevel = 'excellent' | 'good' | 'neutral' | 'poor' | 'bad';

function getReactionLevel(score: number): ReactionLevel {
  if (score >= 9) return 'excellent';
  if (score >= 7) return 'good';
  if (score >= 5) return 'neutral';
  if (score >= 3) return 'poor';
  return 'bad';
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-sm font-bold text-slate-700">{score}/{max}</span>
    </div>
  );
}

export default function DigitalHumanInterview() {
  const [selectedRole, setSelectedRole] = useState('产品经理');
  const [activeGroup, setActiveGroup] = useState<InterviewGroupKey>('tech');
  const [answerText, setAnswerText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [interviewerGender, setInterviewerGender] = useState<VoiceGender>('male');

  const headRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const ttsRef = useRef<NaturalTTS | null>(null);
  const interviewerTTSRef = useRef<InterviewerTTS | null>(null);
  const spokenTextRef = useRef<string>('');
  const mouthAnimRef = useRef<number | null>(null);
  const isEdgeTTSPathRef = useRef(false); // true when Edge TTS is driving lip-sync

  const {
    phase, questions, currentQuestion, currentFeedback, finalResult,
    isLoading, isSpeaking, setIsSpeaking, totalRounds, currentRound,
    answers, startInterview, submitAnswer, requestFinalEvaluation, resetInterview,
  } = useInterview(selectedRole);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsRef.current = new NaturalTTS({
        onSpeakingChange: (speaking) => setIsSpeaking(speaking),
        onSpeak: (text) => { spokenTextRef.current = text; },
        gender: interviewerGender,
      });
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAnswerText(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (interviewerTTSRef.current) {
        interviewerTTSRef.current.cancel();
      }
      if (ttsRef.current) {
        ttsRef.current.cancel();
      }
    };
  }, []);

  const loadAvatar = useCallback(async (gender: VoiceGender) => {
    if (!containerRef.current) return;

    setAvatarLoaded(false);
    setAvatarError('');
    setAvatarProgress(0);

    try {
      const { TalkingHead } = await import('@met4citizen/talkinghead');

      if (!headRef.current) {
        const head = new TalkingHead(containerRef.current, {
          ttsLang: 'zh-CN',
          lipsyncModules: [],
          avatarMood: 'neutral',
          cameraView: 'upper',
          cameraDistance: 0.35,
          cameraY: 0.06,
          lightAmbientColor: 0xfff8f0,
          lightAmbientIntensity: 3.2,
          lightDirectColor: 0xfff0dd,
          lightDirectIntensity: 35,
          lightSpotColor: 0x5599cc,
          lightSpotIntensity: 8,
          lightSpotPhi: 0.3,
          lightSpotTheta: 3.5,
          lightSpotDispersion: 1.5,
          avatarIdleEyeContact: 0.4,
          avatarSpeakingEyeContact: 0.7,
          avatarSpeakingHeadMove: 0.4,
        });
        headRef.current = head;
      }

      const candidates = AVATAR_BY_GENDER[gender];
      let loaded = false;
      for (const candidate of candidates) {
        try {
          await headRef.current.showAvatar({
            url: candidate.url,
            body: candidate.body,
            avatarMood: 'neutral',
            ttsLang: 'zh-CN',
          });
          loaded = true;
          break;
        } catch (e) {
          console.warn(`Avatar ${candidate.url} failed, trying next...`, e);
        }
      }

      if (loaded) {
        setAvatarLoaded(true);
        setAvatarProgress(100);
        // Initialize InterviewerTTS with the loaded TalkingHead instance
        interviewerTTSRef.current = new InterviewerTTS(
          headRef.current,
          (speaking) => {
            setIsSpeaking(speaking);
            if (!speaking) isEdgeTTSPathRef.current = false;
          }
        );
      } else {
        setAvatarError('所有头像资源加载失败');
      }
    } catch (err: any) {
      console.error('Avatar init error:', err);
      setAvatarError(err.message || '数字人加载失败');
    }
  }, []);

  useEffect(() => {
    loadAvatar(interviewerGender);

    return () => {
      if (headRef.current) {
        try { headRef.current.stop(); } catch {}
        headRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────────────────────
  // Text-driven real lip-sync (FALLBACK path only)
  //
  // When Edge TTS (InterviewerTTS) is active, TalkingHead's native
  // speakAudio() handles viseme animation internally — this rAF loop
  // is bypassed entirely. It only runs when falling back to the browser
  // Web Speech API (NaturalTTS), where we must drive blend shapes manually.
  // ──────────────────────────────────────────────
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;

    // Skip if Edge TTS is driving lip-sync natively
    if (isEdgeTTSPathRef.current) return;

    if (isSpeaking) {
      const text = spokenTextRef.current;
      if (!text) {
        // Fallback: no text tracked yet, use mild idle open-close
        let phase = 0;
        const fallbackAnimate = () => {
          phase += 0.06;
          try {
            head.setFixedValue('jawOpen', Math.abs(Math.sin(phase)) * 0.3);
          } catch {}
          mouthAnimRef.current = requestAnimationFrame(fallbackAnimate);
        };
        mouthAnimRef.current = requestAnimationFrame(fallbackAnimate);
        return () => {
          if (mouthAnimRef.current) cancelAnimationFrame(mouthAnimRef.current);
        };
      }

      // 1. Generate viseme keyframe sequence from Chinese text
      const sequence = textToVisemes(text);

      // 2. Pre-group keyframes by viseme for O(1) interpolation
      const visemeTimeline: Record<string, { timeMs: number; weight: number }[]> = {};
      for (const kf of sequence.keyframes) {
        (visemeTimeline[kf.viseme] ??= []).push({ timeMs: kf.timeMs, weight: kf.weight });
      }
      for (const group of Object.values(visemeTimeline)) {
        group.sort((a, b) => a.timeMs - b.timeMs);
      }

      // Helper: interpolate weight for a viseme at elapsed time
      const interpWeight = (kfs: { timeMs: number; weight: number }[], t: number): number => {
        if (kfs.length === 0) return 0;
        if (t <= kfs[0].timeMs) return kfs[0].weight;
        if (t >= kfs[kfs.length - 1].timeMs) return kfs[kfs.length - 1].weight;
        for (let i = 0; i < kfs.length - 1; i++) {
          if (t >= kfs[i].timeMs && t <= kfs[i + 1].timeMs) {
            const frac = (t - kfs[i].timeMs) / Math.max(kfs[i + 1].timeMs - kfs[i].timeMs, 1);
            return kfs[i].weight + (kfs[i + 1].weight - kfs[i].weight) * frac;
          }
        }
        return 0;
      };

      const startTime = performance.now();
      let lastBlends: Record<string, number> = {};

      const animate = () => {
        const elapsed = performance.now() - startTime;

        // Animation finished — reset all mouth shapes
        if (elapsed > sequence.durationMs + 300) {
          for (const key of Object.keys(lastBlends)) {
            try { head.setFixedValue(key, null); } catch {}
          }
          return;
        }

        // 3. Compute current blend shape targets from active visemes
        const newBlends: Record<string, number> = {};
        for (const [viseme, kfs] of Object.entries(visemeTimeline)) {
          const weight = interpWeight(kfs, elapsed);
          if (weight > 0.005) {
            const shapes = visemeToBlendShapes(viseme as VisemeCode);
            for (const [key, val] of Object.entries(shapes)) {
              // Use max-combine: strongest viseme wins for each blend shape
              newBlends[key] = Math.max(newBlends[key] || 0, val * weight);
            }
          }
        }

        // 4. Apply blend shapes (only changed values to reduce calls)
        const allKeys = new Set([...Object.keys(lastBlends), ...Object.keys(newBlends)]);
        for (const key of allKeys) {
          const newVal = newBlends[key] || 0;
          const lastVal = lastBlends[key] || 0;
          if (Math.abs(newVal - lastVal) > 0.003) {
            try { head.setFixedValue(key, newVal); } catch {}
          }
        }
        // Release keys that are no longer active
        for (const key of Object.keys(lastBlends)) {
          if (!(key in newBlends)) {
            try { head.setFixedValue(key, null); } catch {}
          }
        }

        lastBlends = newBlends;
        mouthAnimRef.current = requestAnimationFrame(animate);
      };

      mouthAnimRef.current = requestAnimationFrame(animate);

      return () => {
        if (mouthAnimRef.current) cancelAnimationFrame(mouthAnimRef.current);
      };
    } else {
      // Not speaking — cancel animation and reset all mouth shapes
      if (mouthAnimRef.current) {
        cancelAnimationFrame(mouthAnimRef.current);
        mouthAnimRef.current = null;
      }
      try {
        for (const key of ['jawOpen', 'mouthStretchLeft', 'mouthStretchRight',
          'mouthPucker', 'mouthPressLeft', 'mouthPressRight', 'mouthRollLower',
          'mouthRollUpper', 'mouthFrownLeft', 'mouthFrownRight']) {
          head.setFixedValue(key, null);
        }
      } catch {}
    }

    return () => {
      if (mouthAnimRef.current) cancelAnimationFrame(mouthAnimRef.current);
    };
  }, [isSpeaking]);

  const playReaction = useCallback((level: ReactionLevel) => {
    const head = headRef.current;
    if (!head) return;

    try {
      switch (level) {
        case 'excellent':
          head.setMood('happy');
          head.playGesture('thumbup', 3);
          setTimeout(() => head.lookAtCamera(2000), 500);
          setTimeout(() => head.makeEyeContact(2000), 1500);
          setTimeout(() => head.setMood('neutral'), 4000);
          break;
        case 'good':
          head.setMood('happy');
          head.playGesture('ok', 2.5);
          setTimeout(() => head.makeEyeContact(1500), 500);
          setTimeout(() => head.setMood('neutral'), 3000);
          break;
        case 'neutral':
          head.setMood('neutral');
          head.playGesture('side', 2);
          setTimeout(() => head.lookAtCamera(1500), 800);
          break;
        case 'poor':
          head.setMood('sad');
          head.playGesture('shrug', 2.5);
          setTimeout(() => head.lookAtCamera(1500), 1000);
          setTimeout(() => head.setMood('neutral'), 3500);
          break;
        case 'bad':
          head.setMood('angry');
          head.playGesture('thumbdown', 2);
          setTimeout(() => head.lookAtCamera(1500), 800);
          setTimeout(() => head.setMood('neutral'), 3000);
          break;
      }
    } catch {}
  }, []);

  const speakText = useCallback(async (text: string, reactionLevel?: ReactionLevel) => {
    if (!ttsRef.current) return;
    if (isMuted) return;

    if (reactionLevel) {
      playReaction(reactionLevel);
    }

    let emotion: EmotionType = 'neutral';
    if (reactionLevel === 'excellent' || reactionLevel === 'good') {
      emotion = reactionLevel === 'excellent' ? 'encouraging' : 'satisfied';
    } else if (reactionLevel === 'poor' || reactionLevel === 'bad') {
      emotion = reactionLevel === 'bad' ? 'critical' : 'disappointed';
    }

    // ---- Primary path: Edge TTS API + TalkingHead native lip-sync ----
    if (interviewerTTSRef.current && headRef.current?.audioCtx) {
      try {
        isEdgeTTSPathRef.current = true;
        const success = await interviewerTTSRef.current.speak(text, {
          emotion,
          gender: interviewerGender,
        });
        if (success) return; // Edge TTS path succeeded
      } catch (err) {
        console.warn('[TTS] Edge TTS failed, falling back to browser TTS:', err);
      }
      isEdgeTTSPathRef.current = false;
    }

    // ---- Fallback path: browser Web Speech API + text-driven viseme animation ----
    spokenTextRef.current = text;
    await ttsRef.current.speak(text, emotion);
  }, [playReaction, isMuted, interviewerGender]);

  // 统一语音播报 effect：先播反馈，等反馈播完再播问题
  // 避免 currentFeedback 和 currentQuestion 同时更新时互相打断
  useEffect(() => {
    let cancelled = false;

    const sequenceSpeech = async () => {
      // Step 1: 优先播报上一轮反馈（如果有）
      if (currentFeedback && phase !== 'idle') {
        const reactionLevel = getReactionLevel(currentFeedback.score);
        await speakText(currentFeedback.feedback, reactionLevel);
        if (cancelled) return;
      }

      // Step 2: 反馈播完后，再播报当前问题
      if (currentQuestion && phase === 'questioning') {
        if (cancelled) return;
        await speakText(currentQuestion.question);
      }
    };

    sequenceSpeech();

    return () => {
      cancelled = true;
      if (interviewerTTSRef.current) {
        interviewerTTSRef.current.cancel();
        isEdgeTTSPathRef.current = false;
      }
      if (ttsRef.current) {
        ttsRef.current.cancel();
      }
    };
  }, [currentQuestion, currentFeedback, phase, speakText]);

  const handleToggleRecord = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleStart = useCallback(async () => {
    await startInterview();
  }, [startInterview]);

  const handleSubmit = useCallback(() => {
    if (!answerText.trim()) return;
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (interviewerTTSRef.current) {
      interviewerTTSRef.current.cancel();
      isEdgeTTSPathRef.current = false;
    }
    if (ttsRef.current) ttsRef.current.cancel();
    submitAnswer(answerText);
    setAnswerText('');
  }, [answerText, submitAnswer, isRecording]);

  const handleToggleMute = useCallback(() => {
    if (!isMuted && interviewerTTSRef.current) {
      interviewerTTSRef.current.cancel();
      isEdgeTTSPathRef.current = false;
    }
    if (!isMuted && ttsRef.current) {
      ttsRef.current.cancel();
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSwitchGender = useCallback((gender: VoiceGender) => {
    if (gender === interviewerGender) return;
    if (interviewerTTSRef.current) {
      interviewerTTSRef.current.cancel();
      isEdgeTTSPathRef.current = false;
    }
    if (ttsRef.current) {
      ttsRef.current.cancel();
      ttsRef.current.setGender(gender);
    }
    setInterviewerGender(gender);
    loadAvatar(gender);
  }, [interviewerGender, loadAvatar]);

  const handleReset = useCallback(() => {
    resetInterview();
    setAnswerText('');
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    // Cancel both TTS engines
    if (interviewerTTSRef.current) {
      interviewerTTSRef.current.cancel();
      isEdgeTTSPathRef.current = false;
    }
    if (ttsRef.current) ttsRef.current.cancel();
    if (headRef.current) {
      try { headRef.current.speakBreak(0); } catch {}
    }
  }, [resetInterview]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/career-blueprint" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">返回生涯蓝图</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                AI 数字人模拟面试
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">基于 TalkingHead 3D 数字人 · 沉浸式面试体验</p>
            </div>
          </div>
          {phase !== 'idle' && (
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm transition-colors shadow-sm">
              <RotateCcw className="w-4 h-4" /> 重新面试
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* Left: Digital Human */}
          <div className="relative rounded-2xl border border-slate-200 overflow-hidden shadow-sm" style={{ minHeight: 560 }}>
            {/* Office Background Scene */}
            <div className="absolute inset-0 z-0" style={{
              background: `
                linear-gradient(180deg, 
                  #0a0d14 0%, 
                  #0d1018 30%, 
                  #10131c 50%, 
                  #13161f 65%, 
                  #181b24 80%, 
                  #1c1f28 100%
                )
              `,
            }}>
              <div className="absolute left-[8%] top-0 bottom-[35%] w-px bg-white/[0.03]" />
              <div className="absolute left-[25%] top-0 bottom-[35%] w-px bg-white/[0.03]" />
              <div className="absolute right-[8%] top-0 bottom-[35%] w-px bg-white/[0.03]" />
              <div className="absolute right-[25%] top-0 bottom-[35%] w-px bg-white/[0.03]" />
              <div className="absolute left-0 right-0 bottom-[35%] h-px bg-white/[0.04]" />
              <div className="absolute left-0 right-0 bottom-0 h-[35%]" style={{
                background: 'linear-gradient(180deg, #141720 0%, #0c0f16 100%)',
              }} />
              <div className="absolute left-0 right-0 bottom-[35%] h-[2px]" style={{
                background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 80%, transparent 95%)',
              }} />
              <div className="absolute left-[3%] top-[5%] w-[18%] h-[45%] rounded-sm" style={{
                background: 'linear-gradient(180deg, rgba(120,150,200,0.06) 0%, rgba(100,130,180,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.03)',
              }} />
              <div className="absolute right-[3%] top-[5%] w-[18%] h-[45%] rounded-sm" style={{
                background: 'linear-gradient(180deg, rgba(120,150,200,0.06) 0%, rgba(100,130,180,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.03)',
              }} />
              <div className="absolute left-[10%] right-[10%] bottom-[33%] h-[3%] rounded-sm" style={{
                background: 'linear-gradient(180deg, rgba(40,38,35,0.6) 0%, rgba(30,28,26,0.4) 100%)',
                borderTop: '1px solid rgba(255,255,255,0.03)',
              }} />
              <div className="absolute left-[15%] bottom-[36%] w-[12%] h-[16%] rounded-sm" style={{
                background: 'linear-gradient(180deg, rgba(80,120,180,0.05) 0%, rgba(60,100,160,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.02)',
                boxShadow: '0 0 15px rgba(80,120,180,0.04)',
              }} />
              <div className="absolute right-[15%] bottom-[36%] w-[12%] h-[16%] rounded-sm" style={{
                background: 'linear-gradient(180deg, rgba(80,120,180,0.05) 0%, rgba(60,100,160,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.02)',
                boxShadow: '0 0 15px rgba(80,120,180,0.04)',
              }} />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[60%] h-[30%]" style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(255,240,220,0.04) 0%, transparent 70%)',
              }} />
              <div className="absolute left-1/2 -translate-x-1/2 top-[10%] w-[40%] h-[60%]" style={{
                background: 'radial-gradient(ellipse at 50% 30%, rgba(255,235,200,0.03) 0%, transparent 60%)',
              }} />
              <div className="absolute left-1/2 -translate-x-1/2 top-[8%] px-4 py-1.5 rounded" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.03)',
              }}>
                <span className="text-[10px] tracking-[0.2em] text-white/15 font-light">INTERVIEW ROOM</span>
              </div>
              <div className="absolute left-[5%] bottom-[35%] w-[6%] h-[18%]" style={{
                background: 'linear-gradient(180deg, rgba(40,70,40,0.12) 0%, rgba(30,50,30,0.08) 60%, rgba(60,45,30,0.06) 100%)',
                borderRadius: '30% 30% 5% 5%',
              }} />
              <div className="absolute right-[5%] bottom-[35%] w-[6%] h-[18%]" style={{
                background: 'linear-gradient(180deg, rgba(40,70,40,0.12) 0%, rgba(30,50,30,0.08) 60%, rgba(60,45,30,0.06) 100%)',
                borderRadius: '30% 30% 5% 5%',
              }} />
            </div>

            {/* 3D Avatar Container */}
            <div
              ref={containerRef}
              className="absolute inset-0 z-10"
              style={{ minHeight: 560 }}
            />

            {/* Loading overlay */}
            {!avatarLoaded && !avatarError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                <div className="text-center">
                  <p className="text-white font-medium">3D 数字人加载中...</p>
                  <p className="text-slate-400 text-sm mt-1">首次加载可能需要几秒钟</p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {avatarError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-amber-300 font-medium">3D 数字人加载失败</p>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs">{avatarError}</p>
                  <p className="text-slate-500 text-xs mt-2">面试功能仍可正常使用</p>
                </div>
              </div>
            )}

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-amber-400 rounded-full"
                      animate={{ height: [8, 20, 8] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-white/80">面试官正在说话</span>
              </div>
            )}

            {/* Mute toggle */}
            <button
              onClick={handleToggleMute}
              className="absolute top-4 right-4 z-30 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>

            {/* Gender toggle */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => handleSwitchGender('male')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  interviewerGender === 'male'
                    ? 'bg-blue-500/80 text-white shadow-sm'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                男考官
              </button>
              <button
                onClick={() => handleSwitchGender('female')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  interviewerGender === 'female'
                    ? 'bg-pink-500/80 text-white shadow-sm'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                女考官
              </button>
            </div>
          </div>

          {/* Right: Interview Panel */}
          <div className="flex flex-col gap-4">
            {/* Role Selection (idle phase) */}
            {phase === 'idle' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  选择面试岗位
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {INTERVIEW_GROUPS.map(g => (
                    <button
                      key={g.key}
                      onClick={() => setActiveGroup(g.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeGroup === g.key
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-6 max-h-[240px] overflow-y-auto pr-1">
                  {INTERVIEW_ROLES.filter(r => r.group === activeGroup).map(role => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                        selectedRole === role.value
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isLoading ? '准备中...' : '开始模拟面试'}
                </button>
              </motion.div>
            )}

            {/* Question Display */}
            {phase !== 'idle' && currentQuestion && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {currentQuestion.category}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      currentQuestion.source === 'ai'
                        ? 'text-purple-600 bg-purple-50'
                        : 'text-emerald-600 bg-emerald-50'
                    }`}>
                      {currentQuestion.source === 'ai' ? 'AI追问' : '题库'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    第 {currentRound}/{totalRounds} 轮
                  </span>
                </div>
                <p className="text-slate-900 text-base leading-relaxed font-medium">
                  {currentQuestion.question}
                </p>
                <div className="flex gap-1.5 mt-4">
                  {Array.from({ length: totalRounds }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < currentRound - 1 ? 'bg-amber-500' :
                        i === currentRound - 1 ? 'bg-amber-400 animate-pulse' :
                        'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feedback Display */}
            {currentFeedback && phase === 'questioning' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-emerald-600">上一轮评价</span>
                </div>
                <ScoreBar score={currentFeedback.score} />
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{currentFeedback.feedback}</p>
              </motion.div>
            )}

            {/* Answer Input */}
            {(phase === 'questioning' || phase === 'answering') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  {isRecording ? (
                    <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                  ) : (
                    <Send className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-xs text-slate-500">
                    {isRecording ? '语音识别中，请说话...' : '输入你的回答'}
                  </span>
                </div>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  placeholder="请输入你的回答，或点击语音按钮直接说话..."
                  className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
                  rows={4}
                />
                <div className="flex items-center gap-2 mt-3">
                  {speechSupported && (
                    <button
                      onClick={handleToggleRecord}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        isRecording
                          ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {isRecording ? '停止' : '语音'}
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!answerText.trim() || isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-200"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isLoading ? '评估中...' : '提交回答'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Evaluating state */}
            {phase === 'evaluating' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-4 shadow-sm">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-slate-600 font-medium">AI 面试官正在评估你的回答...</p>
              </motion.div>
            )}

            {/* Final Result */}
            {phase === 'finished' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="text-center mb-6">
                  <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-slate-900 mb-1">面试结束</h3>
                  <p className="text-slate-500 text-sm">以下是你的面试综合评价</p>
                </div>

                {finalResult ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                      <div className="text-4xl font-black text-amber-600">{finalResult.score}</div>
                      <div className="text-xs text-amber-500 mt-1">综合评分</div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{finalResult.feedback}</p>
                    {finalResult.strengths?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-emerald-600 mb-2">✅ 优势</h4>
                        {finalResult.strengths.map((s: string, i: number) => (
                          <div key={i} className="text-sm text-slate-600 flex items-start gap-2 mb-1">
                            <span className="text-emerald-500 shrink-0 mt-0.5">▸</span>{s}
                          </div>
                        ))}
                      </div>
                    )}
                    {finalResult.improvements?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-amber-600 mb-2">⚠️ 待提升</h4>
                        {finalResult.improvements.map((s: string, i: number) => (
                          <div key={i} className="text-sm text-slate-600 flex items-start gap-2 mb-1">
                            <span className="text-amber-500 shrink-0 mt-0.5">▸</span>{s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={requestFinalEvaluation}
                      disabled={isLoading}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-amber-200"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '生成综合评价'}
                    </button>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-xl transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> 再来一次
                </button>
              </motion.div>
            )}

            {/* History */}
            {answers.length > 0 && phase !== 'idle' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 max-h-[200px] overflow-y-auto shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 mb-3">面试记录</h4>
                <div className="space-y-2">
                  {answers.map((a, i) => (
                    <div key={a.questionId} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 shrink-0">Q{i + 1}</span>
                      <span className="text-slate-600 truncate flex-1">{questions[i]?.question}</span>
                      <span className={`shrink-0 font-bold ${a.score >= 8 ? 'text-emerald-600' : a.score >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                        {a.score}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowConfig(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">数字人技术说明</h3>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-medium text-slate-900 mb-2">3D 数字人引擎</p>
                  <p className="text-slate-500">使用 <span className="text-blue-600">TalkingHead</span> 开源3D数字人引擎，基于 Ready Player Me 专业商务形象 + Three.js WebGL 渲染，支持实时口型同步与面试场景背景。</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-medium text-slate-900 mb-2">语音合成 (TTS)</p>
                  <p className="text-slate-500">使用浏览器内置 Web Speech API + 自然韵律引擎，支持智能分段停顿、语调变化、情感表达，语音更接近真人效果。</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-medium text-slate-900 mb-2">语音识别 (ASR)</p>
                  <p className="text-slate-500">使用浏览器内置 Web Speech API 进行语音识别，支持中文实时转文字。</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-amber-700 text-xs">💡 推荐使用 Chrome / Edge 浏览器以获得最佳体验。3D 数字人首次加载需要下载模型文件。</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="w-full mt-4 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-xl transition-colors shadow-sm shadow-amber-200"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
