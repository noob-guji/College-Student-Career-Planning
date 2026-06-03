import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ai/stats
 * 从 ChatLog 表查询真实运行统计
 */
export async function GET() {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalLogs, todayLogs, avgLatencyRaw, cacheHits] = await Promise.all([
      // 总对话轮次
      prisma.chatLog.count(),

      // 今日调用次数
      prisma.chatLog.count({ where: { createdAt: { gte: today } } }),

      // 平均延迟（有延迟数据的记录）
      prisma.chatLog.aggregate({
        _avg: { latencyMs: true },
        where: { latencyMs: { not: null, gt: 0 } },
      }),

      // 缓存命中（latencyMs 极短视为命中，<100ms）
      prisma.chatLog.count({
        where: { latencyMs: { lt: 100, not: null } },
      }),
    ]);

    const avgLatency = avgLatencyRaw._avg.latencyMs ?? 0;
    const cacheRate  = totalLogs > 0
      ? Math.round((cacheHits / totalLogs) * 100)
      : 0;

    return NextResponse.json({
      todayCalls:   todayLogs,
      totalRounds:  totalLogs,
      avgLatencyMs: Math.round(avgLatency),
      cacheHitRate: cacheRate,
    });
  } catch (e: any) {
    // 数据库未就绪时返回0
    return NextResponse.json({
      todayCalls: 0, totalRounds: 0, avgLatencyMs: 0, cacheHitRate: 0,
      error: e.message,
    });
  }
}
