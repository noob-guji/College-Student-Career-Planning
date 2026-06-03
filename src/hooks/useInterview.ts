import { useState, useCallback, useRef } from 'react';
import { getQuestionsForRole } from '@/data/interviewQuestions';

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  round: number;
  source: 'bank' | 'ai';
}

export interface InterviewAnswer {
  questionId: string;
  content: string;
  score: number;
  feedback: string;
}

export type InterviewPhase = 'idle' | 'ready' | 'questioning' | 'answering' | 'evaluating' | 'finished';

const EVALUATION_AND_NEXT_PROMPT = `你是一位专业的AI面试官，正在对大学生进行模拟面试。你需要完成两个任务：

任务一：评估候选人刚才的回答
1. 给出1-10分的评分
2. 给出简短精炼的点评（2-3句话）

任务二：基于候选人的回答和面试上下文，生成一个追问或新的面试问题
1. 问题应该与候选人刚才的回答内容相关，或者深入挖掘候选人提到的某个方面
2. 问题要具体、有针对性，避免过于宽泛
3. 同时给出问题所属类别

请严格以JSON格式回复：
{"type":"evaluation_and_next","score":8,"feedback":"简短点评","nextQuestion":"追问的问题内容","nextCategory":"问题类别"}`;

const EVALUATION_ONLY_PROMPT = `你是一位专业的AI面试官，正在对大学生进行模拟面试评估。请根据候选人的回答给出评分和点评。

规则：
1. 对候选人的回答给出1-10分的评分
2. 给出简短精炼的点评（2-3句话）
3. 请严格以JSON格式回复

回复格式：
{"type":"evaluation","score":8,"feedback":"简短点评"}`;

const FINAL_PROMPT = `你是一位专业的AI面试官，面试已经结束，请根据所有问答记录给出综合评价。

规则：
1. 给出0-100的综合评分
2. 给出总体评价（3-5句话）
3. 列出候选人的优势（2-3条）
4. 列出需要改进的方面（2-3条）
5. 请严格以JSON格式回复

回复格式：
{"type":"final","score":85,"feedback":"总体评价","strengths":["优势1","优势2"],"improvements":["改进1","改进2"]}`;

export function useInterview(targetRole?: string) {
  const [phase, setPhase] = useState<InterviewPhase>('idle');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<InterviewAnswer | null>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const roundRef = useRef(0);
  const questionPoolRef = useRef<{ question: string; category: string }[]>([]);
  const totalRounds = 5;

  const isAIRound = (round: number): boolean => round % 2 === 0;

  const pickNextBankQuestion = useCallback((): { question: string; category: string } | null => {
    if (questionPoolRef.current.length > 0) {
      const idx = Math.floor(Math.random() * questionPoolRef.current.length);
      const q = questionPoolRef.current.splice(idx, 1)[0];
      return q;
    }
    return null;
  }, []);

  const buildQAContext = useCallback(() => {
    return questions.map((q, i) => {
      const a = answers[i];
      return a ? `Q${i + 1}(${q.category}): ${q.question}\n候选人回答: ${a.content}` : '';
    }).filter(Boolean).join('\n\n');
  }, [questions, answers]);

  const startInterview = useCallback(async () => {
    setPhase('ready');
    setIsLoading(true);
    roundRef.current = 0;
    setQuestions([]);
    setAnswers([]);
    setCurrentFeedback(null);
    setFinalResult(null);

    const bank = getQuestionsForRole(targetRole || '');
    if (bank) {
      questionPoolRef.current = [...bank.questions].sort(() => Math.random() - 0.5);
    } else {
      questionPoolRef.current = [
        { question: '请先做一个简单的自我介绍，包括你的专业背景和求职意向。', category: '自我介绍' },
        { question: '请谈谈你对这个岗位的理解，以及你为什么适合这个岗位。', category: '岗位认知' },
        { question: '请描述你参与过的一个项目，你在其中承担了什么角色？', category: '项目经验' },
        { question: '你在团队合作中遇到过什么困难？你是如何解决的？', category: '团队协作' },
        { question: '你对未来3-5年的职业规划是什么？', category: '职业规划' },
      ].sort(() => Math.random() - 0.5);
    }

    const firstQ = pickNextBankQuestion();
    if (firstQ) {
      const q: InterviewQuestion = {
        id: Date.now().toString(),
        question: firstQ.question,
        category: firstQ.category,
        round: 1,
        source: 'bank',
      };
      setCurrentQuestion(q);
      setQuestions([q]);
      roundRef.current = 1;
    }

    setIsLoading(false);
    setPhase('questioning');
  }, [targetRole, pickNextBankQuestion]);

  const submitAnswer = useCallback(async (answerText: string) => {
    if (!currentQuestion || !answerText.trim()) return;

    setPhase('evaluating');
    setIsLoading(true);

    const userAnswer: InterviewAnswer = {
      questionId: currentQuestion.id,
      content: answerText,
      score: 0,
      feedback: '',
    };

    const nextRound = roundRef.current + 1;
    const needAIQuestion = isAIRound(nextRound) && nextRound <= totalRounds;
    const qaContext = buildQAContext();

    if (needAIQuestion) {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: EVALUATION_AND_NEXT_PROMPT },
              { role: 'user', content: `面试岗位：${targetRole || '综合'}\n\n面试上下文：\n${qaContext}\n\n当前问题(${currentQuestion.category})：${currentQuestion.question}\n候选人回答：${answerText}\n\n请评估回答并生成一个追问。` },
            ],
          }),
        });

        const data = await res.json();
        const content = data.content || '';

        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            userAnswer.score = parsed.score || 0;
            userAnswer.feedback = parsed.feedback || '回答已收到。';

            setCurrentFeedback(userAnswer);
            setAnswers(prev => [...prev, userAnswer]);

            if (nextRound > totalRounds) {
              setPhase('finished');
            } else {
              const aiQ: InterviewQuestion = {
                id: (Date.now() + 1).toString(),
                question: parsed.nextQuestion || '请进一步详细说明你刚才提到的内容。',
                category: parsed.nextCategory || '深入追问',
                round: nextRound,
                source: 'ai',
              };
              setCurrentQuestion(aiQ);
              setQuestions(prev => [...prev, aiQ]);
              roundRef.current = nextRound;
              setPhase('questioning');
            }

            setIsLoading(false);
            return;
          }
        } catch {}
      } catch {}
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: EVALUATION_ONLY_PROMPT },
            { role: 'user', content: `面试岗位：${targetRole || '综合'}\n面试问题：${currentQuestion.question}\n候选人回答：${answerText}` },
          ],
        }),
      });

      const data = await res.json();
      const content = data.content || '';

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          userAnswer.score = parsed.score || 0;
          userAnswer.feedback = parsed.feedback || '回答已收到。';
        }
      } catch {
        userAnswer.feedback = '回答已收到，请继续。';
      }
    } catch {
      userAnswer.feedback = '网络异常，回答已记录。';
    }

    setCurrentFeedback(userAnswer);
    setAnswers(prev => [...prev, userAnswer]);

    if (nextRound > totalRounds) {
      setPhase('finished');
    } else {
      const bankQ = pickNextBankQuestion();
      const nextQ: InterviewQuestion = {
        id: (Date.now() + 1).toString(),
        question: bankQ?.question || '请谈谈你在项目中遇到的最大挑战以及你是如何解决的。',
        category: bankQ?.category || '项目经验',
        round: nextRound,
        source: 'bank',
      };
      setCurrentQuestion(nextQ);
      setQuestions(prev => [...prev, nextQ]);
      roundRef.current = nextRound;
      setPhase('questioning');
    }

    setIsLoading(false);
  }, [currentQuestion, targetRole, pickNextBankQuestion, buildQAContext]);

  const requestFinalEvaluation = useCallback(async () => {
    setIsLoading(true);
    try {
      const qaSummary = questions.map((q, i) => `Q${i + 1}(${q.category}): ${q.question}\nA${i + 1}: ${answers[i]?.content || '未回答'}`).join('\n\n');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: FINAL_PROMPT },
            { role: 'user', content: `面试岗位：${targetRole || '综合'}\n\n以下是所有问答记录，请给出最终评价：\n\n${qaSummary}` },
          ],
        }),
      });
      const data = await res.json();
      const content = data.content || '';
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setFinalResult(parsed);
        }
      } catch {
        setFinalResult({ score: 0, feedback: content, strengths: [], improvements: [] });
      }
    } catch {
      setFinalResult({ score: 0, feedback: '评价生成失败', strengths: [], improvements: [] });
    } finally {
      setIsLoading(false);
    }
  }, [questions, answers, targetRole]);

  const resetInterview = useCallback(() => {
    setPhase('idle');
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestion(null);
    setCurrentFeedback(null);
    setFinalResult(null);
    setIsLoading(false);
    setIsSpeaking(false);
    roundRef.current = 0;
    questionPoolRef.current = [];
  }, []);

  return {
    phase,
    questions,
    answers,
    currentQuestion,
    currentFeedback,
    finalResult,
    isLoading,
    isSpeaking,
    setIsSpeaking,
    totalRounds,
    currentRound: roundRef.current,
    startInterview,
    submitAnswer,
    requestFinalEvaluation,
    resetInterview,
  };
}
