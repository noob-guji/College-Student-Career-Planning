/**
 * 人岗匹配算法
 * 基于用户能力画像（6维度）+ 技能标签 + 期望岗位类型
 * 计算与10个核心岗位的匹配分，返回 Top3 结果
 */

export interface UserProfile {
  selectedJobTypes: string[];   // 期望岗位类型
  skills: string[];             // 已掌握技能/工具
  careerDirection: string;      // 侧重发展方向
  capabilities: Record<string, number>; // 6维能力自评（0-100）
}

export interface MatchResult {
  role: string;
  score: number; // 0-100
  requirements: Record<string, number>; // 该岗位6维能力要求
  tags: string[];
}

// ─────────────────────────────────────────────
// 10个核心岗位的6维能力要求（0-100）
// 参考 lateral_paths.json 的岗位列表
// ─────────────────────────────────────────────
const JOB_REQUIREMENTS: Record<string, Record<string, number>> = {
  '前端开发工程师':  { 逻辑能力: 80, 沟通表达: 75, 执行落地: 85, 创新思维: 78, 领导团队: 55, 抗压能力: 80 },
  'Java开发工程师':  { 逻辑能力: 88, 沟通表达: 68, 执行落地: 85, 创新思维: 70, 领导团队: 60, 抗压能力: 85 },
  '数据分析师':     { 逻辑能力: 90, 沟通表达: 70, 执行落地: 75, 创新思维: 80, 领导团队: 50, 抗压能力: 70 },
  '产品经理':       { 逻辑能力: 80, 沟通表达: 90, 执行落地: 80, 创新思维: 85, 领导团队: 75, 抗压能力: 80 },
  '项目经理':       { 逻辑能力: 75, 沟通表达: 88, 执行落地: 88, 创新思维: 68, 领导团队: 88, 抗压能力: 85 },
  '软件测试工程师':  { 逻辑能力: 85, 沟通表达: 72, 执行落地: 88, 创新思维: 65, 领导团队: 55, 抗压能力: 80 },
  '运营专员':       { 逻辑能力: 72, 沟通表达: 88, 执行落地: 82, 创新思维: 82, 领导团队: 72, 抗压能力: 78 },
  '销售经理':       { 逻辑能力: 68, 沟通表达: 95, 执行落地: 82, 创新思维: 72, 领导团队: 85, 抗压能力: 90 },
  '实施工程师':     { 逻辑能力: 78, 沟通表达: 82, 执行落地: 90, 创新思维: 65, 领导团队: 65, 抗压能力: 82 },
  '技术支持工程师':  { 逻辑能力: 80, 沟通表达: 88, 执行落地: 80, 创新思维: 65, 领导团队: 60, 抗压能力: 85 },
};

// 岗位标签（展示用）
const JOB_TAGS: Record<string, string[]> = {
  '前端开发工程师':  ['技术型', '创意强', '高需求'],
  'Java开发工程师':  ['技术型', '高薪', '稳定'],
  '数据分析师':     ['数据驱动', '高成长', 'AI方向'],
  '产品经理':       ['综合型', '高影响力', '快晋升'],
  '项目经理':       ['管理型', 'PMP认证', '跨部门'],
  '软件测试工程师':  ['细致型', '质量把控', '入门友好'],
  '运营专员':       ['用户导向', '增长黑客', '多元化'],
  '销售经理':       ['高收入', '人脉广', '挑战型'],
  '实施工程师':     ['落地型', '客户接触', '项目制'],
  '技术支持工程师':  ['服务型', '技术+沟通', '稳定'],
};

// 期望岗位类型 → 核心岗位映射
const JOB_TYPE_MAP: Record<string, string[]> = {
  '前端开发':   ['前端开发工程师'],
  '后端开发':   ['Java开发工程师'],
  '产品经理':   ['产品经理'],
  'UI设计':    ['产品经理', '运营专员'],
  '算法工程师': ['数据分析师'],
  '数据分析':  ['数据分析师'],
  '测试':      ['软件测试工程师'],
  '运营':      ['运营专员'],
  '项目管理':  ['项目经理'],
};

// 技能 → 岗位加权
const SKILL_BONUS: Record<string, Record<string, number>> = {
  'JavaScript':  { '前端开发工程师': 12 },
  'TypeScript':  { '前端开发工程师': 10 },
  'Vue':         { '前端开发工程师': 10 },
  'React':       { '前端开发工程师': 10 },
  'Java':        { 'Java开发工程师': 15, '软件测试工程师': 5, '实施工程师': 5 },
  'Python':      { '数据分析师': 15, '软件测试工程师': 8, 'Java开发工程师': 5 },
  'SQL':         { '数据分析师': 10, '实施工程师': 8 },
  'Figma':       { '产品经理': 8, '前端开发工程师': 5 },
  'Photoshop':   { '运营专员': 8, '产品经理': 5 },
  'Excel':       { '数据分析师': 8, '运营专员': 8, '项目经理': 8 },
  'C++':         { 'Java开发工程师': 8, '软件测试工程师': 6 },
  'C/C++':       { 'Java开发工程师': 8, '软件测试工程师': 6 },
};

// 发展方向 → 岗位加权
const DIRECTION_BONUS: Record<string, Record<string, number>> = {
  '技术专家':       { '前端开发工程师': 8, 'Java开发工程师': 8, '数据分析师': 8, '软件测试工程师': 6 },
  '管理/团队领导':  { '项目经理': 10, '产品经理': 8, '销售经理': 8, '运营专员': 6 },
  '全栈复合型':     { '前端开发工程师': 6, 'Java开发工程师': 6, '产品经理': 6, '数据分析师': 5 },
  '独立开发者/创业': { '前端开发工程师': 8, '产品经理': 8, '数据分析师': 6 },
};

// ─────────────────────────────────────────────
// 能力向量余弦相似度（归一化后计算）
// ─────────────────────────────────────────────
function capabilitySimilarity(
  userCaps: Record<string, number>,
  jobReqs: Record<string, number>,
): number {
  const dims = Object.keys(jobReqs);
  const userVec = dims.map(d => (userCaps[d] ?? 75) / 100);
  const jobVec  = dims.map(d => jobReqs[d] / 100);

  const dot   = userVec.reduce((s, v, i) => s + v * jobVec[i], 0);
  const normU = Math.sqrt(userVec.reduce((s, v) => s + v * v, 0)) + 1e-9;
  const normJ = Math.sqrt(jobVec.reduce((s, v)  => s + v * v, 0)) + 1e-9;

  return dot / (normU * normJ); // 0~1
}

// ─────────────────────────────────────────────
// 主匹配函数
// ─────────────────────────────────────────────
export function computeMatchScores(profile: UserProfile): MatchResult[] {
  const allJobs = Object.keys(JOB_REQUIREMENTS);

  const scores = allJobs.map(job => {
    let score = 30; // 基础分

    // 1. 期望岗位偏好（最高 +40）
    for (const pref of profile.selectedJobTypes) {
      const mapped = JOB_TYPE_MAP[pref] ?? [];
      if (mapped.includes(job)) { score += 40; break; }
    }

    // 2. 技能匹配（最高 +30）
    let skillBonus = 0;
    for (const skill of profile.skills) {
      skillBonus += SKILL_BONUS[skill]?.[job] ?? 0;
    }
    score += Math.min(skillBonus, 30);

    // 3. 能力向量相似度（最高 +20）
    const sim = capabilitySimilarity(profile.capabilities, JOB_REQUIREMENTS[job]);
    score += Math.round(sim * 20);

    // 4. 发展方向（最高 +10）
    score += DIRECTION_BONUS[profile.careerDirection]?.[job] ?? 0;

    // 微小随机扰动（±3），避免并列
    score += Math.floor(Math.random() * 7) - 3;

    return { role: job, score: Math.min(Math.max(score, 30), 98) };
  });

  // 按分数降序，取前3
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, 3).map(s => ({
    role: s.role,
    score: s.score,
    requirements: JOB_REQUIREMENTS[s.role],
    tags: JOB_TAGS[s.role] ?? [],
  }));
}

// ─────────────────────────────────────────────
// 构建雷达图对比数据
// ─────────────────────────────────────────────
export function buildMatchRadar(
  userCaps: Record<string, number>,
  topRole: string,
) {
  const dims = ['逻辑能力', '沟通表达', '执行落地', '创新思维', '领导团队', '抗压能力'];
  const reqs = JOB_REQUIREMENTS[topRole] ?? {};
  return dims.map(d => ({
    subject: d,
    User: userCaps[d] ?? 75,
    Post: reqs[d] ?? 75,
    fullMark: 100,
  }));
}

// 默认能力分（未填写时）
export const DEFAULT_CAPABILITIES: Record<string, number> = {
  逻辑能力: 75, 沟通表达: 75, 执行落地: 75, 创新思维: 75, 领导团队: 75, 抗压能力: 75,
};
