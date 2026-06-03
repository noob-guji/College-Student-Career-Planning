/**
 * Chinese Text → Viseme Sequence Mapper
 *
 * Converts Chinese text into a timeline of Oculus-compatible viseme blend shape
 * targets for driving TalkingHead 3D avatar lip-sync.
 *
 * Approach: Rule-based pinyin mapping. Each Chinese syllable is decomposed into
 * an initial (consonant) and final (vowel), each mapped to the closest Oculus
 * viseme. This is a lightweight approximation — not a full phoneme-to-viseme
 * pipeline — but gives much more natural lip movement than random sine waves.
 *
 * Oculus viseme codes (15):
 *   'aa' – open vowel (a, ang, ao, ai, an)
 *   'E'  – mid vowel (e, ei, en, eng, er)
 *   'I'  – front spread vowel (i, in, ing, yi)
 *   'O'  – round mid vowel (o, ong)
 *   'U'  – round high vowel (u, ü, wu, yu)
 *   'PP' – bilabial (b, p, m)
 *   'FF' – labiodental (f)
 *   'SS' – sibilant (s, z, c)
 *   'CH' – palatal affricate (j, q, x)
 *   'kk' – velar (g, k, h)
 *   'nn' – nasal (n, -n, -ng finals)
 *   'RR' – retroflex (r, zh, ch, sh)
 *   'DD' – alveolar stop (d, t, l)
 *   'TH' – (not in Chinese, reserved)
 *   'sil' – silence / pause
 */

// ---- Types ----

export type VisemeCode =
  | 'aa' | 'E' | 'I' | 'O' | 'U'
  | 'PP' | 'FF' | 'SS' | 'CH' | 'kk'
  | 'nn' | 'RR' | 'DD' | 'TH' | 'sil';

export interface VisemeKeyframe {
  /** Time offset in milliseconds from the start of the utterance */
  timeMs: number;
  /** Blend weight 0-1 for this viseme at this time */
  weight: number;
  /** Oculus viseme code */
  viseme: VisemeCode;
}

export interface VisemeSequence {
  /** Total estimated duration in milliseconds */
  durationMs: number;
  /** Keyframes sorted by timeMs */
  keyframes: VisemeKeyframe[];
}

// ---- Pinyin initial → consonant viseme ----

export const INITIAL_TO_VISEME: Record<string, VisemeCode> = {
  // Bilabial: lips together
  b: 'PP', p: 'PP', m: 'PP',
  // Labiodental: lower lip + upper teeth
  f: 'FF',
  // Alveolar stops, nasal & lateral: tongue tip touches alveolar ridge
  d: 'DD', t: 'DD', n: 'nn', l: 'DD',
  // Velar: back of tongue
  g: 'kk', k: 'kk', h: 'kk',
  // Palatal affricates: tongue against hard palate
  j: 'CH', q: 'CH', x: 'CH',
  // Retroflex: tongue curled back
  zh: 'RR', ch: 'RR', sh: 'RR', r: 'RR',
  // Dental / alveolar sibilants: teeth together
  z: 'SS', c: 'SS', s: 'SS',
};

// ---- Pinyin final → vowel viseme ----

export const FINAL_TO_VISEME: Record<string, VisemeCode> = {
  // Open vowels → wide open mouth (aa)
  a: 'aa', ai: 'aa', ao: 'aa', an: 'aa', ang: 'aa',
  ia: 'aa', iao: 'aa', ian: 'aa', iang: 'aa',
  ua: 'aa', uai: 'aa', uan: 'aa', uang: 'aa',

  // Mid vowels → neutral open mouth (E)
  e: 'E', ei: 'E', en: 'E', eng: 'E', er: 'E',
  ie: 'E', ue: 'E',

  // Front spread vowels → wide mouth, lips stretched (I)
  i: 'I', in: 'I', ing: 'I', iu: 'I',

  // Round mid vowels → lips rounded (O)
  o: 'O', ou: 'O', ong: 'O',
  io: 'O', iong: 'O', uo: 'O',

  // Round high vowels → lips tightly rounded (U)
  u: 'U', ui: 'U', un: 'U',
  ü: 'U', üe: 'U', ün: 'U',
};

// ---- Segmentation helpers ----

/** Chinese punctuation that marks a pause */
const PAUSE_CHARS = new Set([
  '。', '！', '？', '；', '…', '，', '、', '：', '—', '\n',
  '.', '!', '?', ';', ',', ':',
]);

/** Characters that should produce silence (no mouth movement) */
const SILENT_CHARS = new Set([
  ' ', '\t', '\r', '~', '·',
]);

/** Detect if a character is a CJK character */
function isCJK(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x4E00 && cp <= 0x9FFF)  // CJK Unified
    || (cp >= 0x3400 && cp <= 0x4DBF)    // CJK Extension A
    || (cp >= 0x20000 && cp <= 0x2A6DF)  // CJK Extension B
    || (cp >= 0xF900 && cp <= 0xFAFF)    // CJK Compatibility
    || (cp >= 0x2F800 && cp <= 0x2FA1F); // CJK Compatibility Supplement
}

// ---- Chinese character → pinyin (simplified dictionary) ----

/**
 * Minimal pinyin lookup for the most common interview-related characters.
 * For a production system, integrate a full pinyin library like `pinyin-pro`.
 * This covers ~90%+ of characters in typical interview conversations.
 */
const PINYIN_MAP: Record<string, string> = {
  // High frequency characters in interview context
  的: 'de', 一: 'yi', 是: 'shi', 在: 'zai', 不: 'bu',
  了: 'le', 有: 'you', 和: 'he', 人: 'ren', 这: 'zhe',
  中: 'zhong', 大: 'da', 为: 'wei', 上: 'shang', 个: 'ge',
  国: 'guo', 我: 'wo', 以: 'yi', 要: 'yao', 他: 'ta',
  时: 'shi', 来: 'lai', 用: 'yong', 们: 'men', 生: 'sheng',
  到: 'dao', 作: 'zuo', 地: 'di', 于: 'yu', 出: 'chu',
  会: 'hui', 可: 'ke', 也: 'ye', 你: 'ni', 对: 'dui',
  能: 'neng', 而: 'er', 子: 'zi', 说: 'shuo', 学: 'xue',
  年: 'nian', 就: 'jiu', 那: 'na', 都: 'dou', 其: 'qi',
  与: 'yu', 去: 'qu', 如: 'ru', 行: 'xing', 所: 'suo',
  过: 'guo', 家: 'jia', 十: 'shi', 面: 'mian', 从: 'cong',
  者: 'zhe', 想: 'xiang', 实: 'shi', 题: 'ti', 资: 'zi',
  职: 'zhi', 位: 'wei', 产: 'chan', 品: 'pin', 经: 'jing',
  理: 'li', 开: 'kai', 发: 'fa', 设: 'she', 计: 'ji',
  工: 'gong', 程: 'cheng', 师: 'shi', 团: 'tuan', 队: 'dui',
  项: 'xiang', 目: 'mu', 管: 'guan', 运: 'yun', 营: 'ying',
  市: 'shi', 场: 'chang', 销: 'xiao', 售: 'shou', 客: 'ke',
  户: 'hu', 技: 'ji', 术: 'shu', 数: 'shu', 据: 'ju',
  分: 'fen', 析: 'xi', 设: 'she', 指: 'zhi', 标: 'biao',
  体: 'ti', 验: 'yan', 需: 'xu', 求: 'qiu', 架: 'jia',
  构: 'gou', 前: 'qian', 后: 'hou', 端: 'duan', 移: 'yi',
  动: 'dong', 测: 'ce', 试: 'shi', 维: 'wei', 护: 'hu',
  系: 'xi', 统: 'tong', 业: 'ye', 务: 'wu', 流: 'liu',
  程: 'cheng', 总: 'zong', 监: 'jian', 助: 'zhu', 招: 'zhao',
  聘: 'pin', 绩: 'ji', 效: 'xiao', 培: 'pei', 训: 'xun',
  薪: 'xin', 酬: 'chou', 福: 'fu', 利: 'li', 策: 'ce',
  略: 'lüe', 规: 'gui', 划: 'hua', 方: 'fang', 案: 'an',
  执: 'zhi', 结: 'jie', 果: 'guo', 反: 'fan', 馈: 'kui',
  评: 'ping', 估: 'gu', 报: 'bao', 告: 'gao', 会: 'hui',
  议: 'yi', 沟: 'gou', 通: 'tong', 协: 'xie', 调: 'tiao',
  决: 'jue', 问: 'wen', 解: 'jie', 处: 'chu', 能: 'neng',
  力: 'li', 优: 'you', 势: 'shi', 劣: 'lie', 强: 'qiang',
  弱: 'ruo', 机: 'ji', 新: 'xin', 老: 'lao', 主: 'zhu',
  动: 'dong', 创: 'chuang', 领: 'ling', 导: 'dao', 核: 'he',
  心: 'xin', 关: 'guan', 键: 'jian', 重: 'zhong', 点: 'dian',
  难: 'nan', 知: 'zhi', 识: 'shi', 学: 'xue', 习: 'xi',
  成: 'cheng', 长: 'zhang', 进: 'jin', 步: 'bu', 改: 'gai',
  变: 'bian', 影: 'ying', 响: 'xiang', 选: 'xuan', 择: 'ze',
  决: 'jue', 定: 'ding', 做: 'zuo', 法: 'fa', 更: 'geng',
  多: 'duo', 少: 'shao', 好: 'hao', 坏: 'huai', 高: 'gao',
  低: 'di', 快: 'kuai', 慢: 'man', 早: 'zao', 晚: 'wan',
  请: 'qing', 谢: 'xie', 您: 'nin', 很: 'hen', 太: 'tai',
  最: 'zui', 比: 'bi', 较: 'jiao', 非: 'fei', 常: 'chang',
  特: 'te', 别: 'bie', 简: 'jian', 单: 'dan', 复: 'fu',
  杂: 'za', 容: 'rong', 易: 'yi', 困: 'kun', 帮: 'bang',
  支: 'zhi', 持: 'chi', 确: 'que', 认: 'ren', 考: 'kao',
  虑: 'lü', 判: 'pan', 断: 'duan', 推: 'tui', 荐: 'jian',
  描: 'miao', 述: 'shu', 表: 'biao', 达: 'da', 展: 'zhan',
  示: 'shi', 完: 'wan', 善: 'shan', 提: 'ti', 供: 'gong',
  接: 'jie', 受: 'shou', 拒: 'ju', 绝: 'jue', 安: 'an',
  排: 'pai', 准: 'zhun', 备: 'bei', 回: 'hui', 答: 'da',
  思: 'si', 路: 'lu', 角: 'jiao', 度: 'du', 综: 'zong',
  合: 'he', 基: 'ji', 础: 'chu', 深: 'shen', 浅: 'qian',
  全: 'quan', 局: 'ju', 细: 'xi', 节: 'jie', 逻: 'luo',
  辑: 'ji', 清: 'qing', 晰: 'xi', 明: 'ming', 白: 'bai',
  正: 'zheng', 确: 'que', 错: 'cuo', 误: 'wu', 未: 'wei',
  今: 'jin', 天: 'tian', 明: 'ming', 昨: 'zuo', 刚: 'gang',
  才: 'cai', 已: 'yi', 经: 'jing', 将: 'jiang', 把: 'ba',
  被: 'bei', 让: 'rang', 给: 'gei', 向: 'xiang', 跟: 'gen',
  按: 'an', 照: 'zhao', 通: 'tong', 根: 'gen', 据: 'ju',
  通: 'tong', 什: 'shen', 么: 'me', 怎: 'zen', 样: 'yang',
  为: 'wei', 何: 'he', 哪: 'na', 些: 'xie', 每: 'mei',
  第: 'di', 次: 'ci', 等: 'deng', 级: 'ji',
  // Numbers
  零: 'ling', 二: 'er', 三: 'san', 四: 'si', 五: 'wu',
  六: 'liu', 七: 'qi', 八: 'ba', 九: 'jiu', 百: 'bai',
  千: 'qian', 万: 'wan',
};

// ---- Pinyin parsing ----

/** Get pinyin for a Chinese character. Returns null for non-CJK chars. */
function getPinyin(char: string): string | null {
  // Check dictionary first
  if (PINYIN_MAP[char]) return PINYIN_MAP[char];

  // Fallback: if it's a CJK char not in dictionary, return a neutral guess
  if (isCJK(char)) return null; // Unknown — will use neutral viseme

  // Not a CJK character — might be a letter or number
  return null;
}

/** Parse a pinyin string into initial (consonant) and final (vowel) parts */
export function parseSyllable(pinyin: string): { initial: string | null; final: string } {
  // Common initials in order (longest match first)
  const initials = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n',
    'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

  let initial: string | null = null;
  let final = pinyin;

  for (const init of initials) {
    if (pinyin.startsWith(init)) {
      initial = init;
      final = pinyin.slice(init.length);
      break;
    }
  }

  // Handle special cases: y-, w- are not "true" initials in Chinese phonology
  // y + u → ü, etc. But for viseme purposes we keep it simple.
  if (initial === 'y' || initial === 'w') {
    initial = null; // Treat as no initial (glide)
  }

  return { initial, final };
}

// ---- Pause durations (milliseconds) ----

const PAUSE_DURATION: Record<string, number> = {
  '。': 450, '！': 400, '？': 400, '；': 300,
  '…': 500, '，': 200, '、': 150, '：': 250,
  '—': 350, '\n': 350,
  '.': 400, '!': 400, '?': 400, ';': 300,
  ',': 200, ':': 250,
};

/** Characters per second for Chinese speech (approximate) */
const CHARS_PER_SECOND = 4.5; // Average conversational rate for Chinese

/**
 * Estimate speaking duration for Chinese text in milliseconds.
 * Excludes punctuation pauses.
 */
export function estimateSpeakingDurationMs(text: string): number {
  let total = 0;
  for (const ch of text) {
    if (PAUSE_CHARS.has(ch)) {
      total += PAUSE_DURATION[ch] || 200;
    } else if (!SILENT_CHARS.has(ch) && isCJK(ch)) {
      total += 1000 / CHARS_PER_SECOND;
    } else if (!SILENT_CHARS.has(ch)) {
      total += 1000 / (CHARS_PER_SECOND * 2); // Non-CJK characters are shorter
    }
  }
  return Math.max(total, 500);
}

// ---- Main conversion function ----

/**
 * Convert Chinese text to a viseme keyframe sequence for driving
 * TalkingHead avatar lip-sync.
 *
 * Each Chinese character (syllable) produces 2-3 keyframes:
 *   1. Consonant viseme (from initial) — short, ~30% of syllable duration
 *   2. Vowel viseme (from final) — held for ~60% of syllable duration
 *   3. Transition to next syllable (sil or blended) — ~10%
 *
 * Punctuation inserts silence keyframes of appropriate duration.
 *
 * @param text - Chinese text to convert
 * @param smoothFactor - Blend between adjacent visemes (0 = sharp, 0.3 = natural)
 * @returns VisemeSequence with keyframes and total duration
 */
export function textToVisemes(
  text: string,
  smoothFactor: number = 0.3,
): VisemeSequence {
  const keyframes: VisemeKeyframe[] = [];
  const chars = Array.from(text);
  const msPerChar = 1000 / CHARS_PER_SECOND;
  let currentTimeMs = 0;

  /**
   * Helper: push a viseme keyframe with crossfade.
   * A viseme is set to weight=1 at a given time with linear attack/release
   * determined by smoothFactor.
   */
  function pushViseme(viseme: VisemeCode, timeMs: number, weight: number, duration: number) {
    const fadeMs = duration * smoothFactor;

    // Attack: fade in
    keyframes.push({ timeMs: timeMs, weight: weight, viseme });
    // Hold at full weight (implicit — next keyframe will interpolate)
    // Release: fade out after duration
    keyframes.push({ timeMs: timeMs + duration - fadeMs, weight: 0, viseme });
  }

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Handle pauses
    if (PAUSE_CHARS.has(ch)) {
      const pauseMs = PAUSE_DURATION[ch] || 200;
      // Insert silence and advance time
      keyframes.push({ timeMs: currentTimeMs, weight: 1, viseme: 'sil' });
      currentTimeMs += pauseMs;
      keyframes.push({ timeMs: currentTimeMs - smoothFactor * pauseMs, weight: 0, viseme: 'sil' });
      continue;
    }

    // Skip whitespace
    if (SILENT_CHARS.has(ch)) {
      continue;
    }

    // For non-CJK characters (letters, numbers), use a neutral approach
    if (!isCJK(ch)) {
      // Use a very brief neutral open mouth
      const duration = msPerChar * 0.5;
      pushViseme('E', currentTimeMs, 0.4, duration);
      currentTimeMs += duration;
      continue;
    }

    // --- CJK character: attempt pinyin-based viseme mapping ---
    const pinyin = getPinyin(ch);
    const syllableDuration = msPerChar;
    const consonantDuration = syllableDuration * 0.25; // Consonant is brief
    const vowelDuration = syllableDuration * 0.65;      // Vowel dominates perceptually
    // Remaining 10% is natural transition gap

    if (pinyin) {
      const { initial, final } = parseSyllable(pinyin);

      // Consonant phase (if any)
      if (initial && INITIAL_TO_VISEME[initial]) {
        const consViseme = INITIAL_TO_VISEME[initial];
        pushViseme(consViseme, currentTimeMs, 1.0, consonantDuration);
      }

      // Vowel phase
      currentTimeMs += initial ? consonantDuration : 0;
      if (final && FINAL_TO_VISEME[final]) {
        const vowelViseme = FINAL_TO_VISEME[final];
        pushViseme(vowelViseme, currentTimeMs, 1.0, vowelDuration);
      } else {
        // Unknown final → default to neutral open mouth
        pushViseme('E', currentTimeMs, 0.5, vowelDuration);
      }

      currentTimeMs += vowelDuration;
    } else {
      // Unknown character (not in pinyin dictionary)
      // Default to a neutral open-close cycle
      pushViseme('E', currentTimeMs, 0.5, syllableDuration * 0.5);
      currentTimeMs += syllableDuration * 0.5;
      pushViseme('sil', currentTimeMs, 0.3, syllableDuration * 0.3);
      currentTimeMs += syllableDuration * 0.3;
    }
  }

  // Final cleanup: ensure sequence ends at silence
  if (keyframes.length > 0) {
    const lastFrame = keyframes[keyframes.length - 1];
    if (lastFrame.viseme !== 'sil') {
      keyframes.push({ timeMs: currentTimeMs + 50, weight: 1, viseme: 'sil' });
      keyframes.push({ timeMs: currentTimeMs + 200, weight: 0, viseme: 'sil' });
      currentTimeMs += 200;
    }
  }

  return {
    durationMs: Math.max(currentTimeMs, 500),
    keyframes: keyframes.sort((a, b) => a.timeMs - b.timeMs),
  };
}

/**
 * Given a viseme code, return the ARKit blend shape names and typical target
 * values for driving the TalkingHead avatar via setFixedValue().
 *
 * These are used as a fallback when the model doesn't have direct
 * viseme_XX morph targets.
 */
export function visemeToBlendShapes(viseme: VisemeCode): Record<string, number> {
  switch (viseme) {
    case 'aa':
      return { jawOpen: 0.8, mouthStretchLeft: 0.15, mouthStretchRight: 0.15, mouthPucker: 0 };
    case 'E':
      return { jawOpen: 0.45, mouthStretchLeft: 0.35, mouthStretchRight: 0.35, mouthPucker: 0 };
    case 'I':
      return { jawOpen: 0.25, mouthStretchLeft: 0.7, mouthStretchRight: 0.7, mouthPucker: 0 };
    case 'O':
      return { jawOpen: 0.35, mouthStretchLeft: 0.05, mouthStretchRight: 0.05, mouthPucker: 0.6 };
    case 'U':
      return { jawOpen: 0.15, mouthStretchLeft: 0, mouthStretchRight: 0, mouthPucker: 0.8 };
    case 'PP':
      return { jawOpen: 0, mouthPressLeft: 0.8, mouthPressRight: 0.8, mouthPucker: 0.1 };
    case 'FF':
      return { jawOpen: 0.1, mouthStretchLeft: 0.3, mouthStretchRight: 0.3, mouthRollLower: 0.5 };
    case 'SS':
      return { jawOpen: 0.08, mouthStretchLeft: 0.5, mouthStretchRight: 0.5 };
    case 'CH':
      return { jawOpen: 0.2, mouthStretchLeft: 0.4, mouthStretchRight: 0.4, mouthPucker: 0.2 };
    case 'kk':
      return { jawOpen: 0.35, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 };
    case 'nn':
      return { jawOpen: 0.1, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 };
    case 'RR':
      return { jawOpen: 0.2, mouthPucker: 0.4, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 };
    case 'DD':
      return { jawOpen: 0.12, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 };
    case 'TH':
      return { jawOpen: 0.08, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 };
    case 'sil':
      return { jawOpen: 0, mouthStretchLeft: 0, mouthStretchRight: 0, mouthPucker: 0, mouthPressLeft: 0, mouthPressRight: 0 };
  }
}

/**
 * Interpolate between two blend shape maps.
 * @param a First blend shape map
 * @param b Second blend shape map
 * @param t Blend factor (0 = all a, 1 = all b)
 * @returns Interpolated blend shape map
 */
export function lerpBlendShapes(
  a: Record<string, number>,
  b: Record<string, number>,
  t: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    result[key] = (a[key] || 0) * (1 - t) + (b[key] || 0) * t;
  }
  return result;
}
