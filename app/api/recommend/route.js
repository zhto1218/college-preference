import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/ai'

export async function POST(request) {
  try {
    const userInfo = await request.json()

    if (!userInfo.score || typeof userInfo.score !== 'number') {
      return NextResponse.json({ error: '请提供有效的分数' }, { status: 400 })
    }
    if (userInfo.score < 200 || userInfo.score > 750) {
      return NextResponse.json({ error: '分数范围应在200-750之间' }, { status: 400 })
    }

    const result = await getRecommendations(userInfo)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('Recommendation error:', err)
    const msg = err.message?.includes('JSON') ? 'AI响应解析失败，请重试' : (err.message || '服务异常，请稍后重试')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
