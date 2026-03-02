'use client'

const TIER = {
  reach: { label: '冲一冲', emoji: '🚀', border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', desc: '有挑战性，值得一试' },
  match: { label: '稳一稳', emoji: '🎯', border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', desc: '较有把握，重点选择' },
  safety: { label: '保一保', emoji: '🛡️', border: 'border-green-200', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', desc: '稳妥保底，必须确保' },
}

function CollegeCard({ college, tier }) {
  const t = TIER[tier]
  return (
    <div className={`rounded-2xl border-2 ${t.border} overflow-hidden shadow-sm`}>
      <div className={`${t.bg} px-4 py-3 flex items-start justify-between gap-3`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{college.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.badge}`}>{college.type}</span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5 flex gap-3">
            <span>📍 {college.city}</span>
            <span className="text-gray-700">推荐：{college.major}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-gray-800">
            {college.admission_score || '-'}
            {college.admission_trend && (
              <span className={`text-sm ml-1 ${college.admission_trend === '↑' ? 'text-red-500' : college.admission_trend === '↓' ? 'text-green-600' : 'text-gray-400'}`}>
                {college.admission_trend}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 text-right leading-snug">
            <div className="text-gray-500">{college.admission_year0 || '最新'}录取线</div>
            {college.admission_score_1 && (
              <>
                <div>{college.admission_score_1} / {college.admission_score_2 || '-'}</div>
                <div>{college.admission_year1} / {college.admission_year2}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-white space-y-1.5">
        {college.reasons?.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-blue-500 mt-0.5 shrink-0">✦</span>
            <span>{r}</span>
          </div>
        ))}
        {(college.employment_highlight || college.risk_note) && (
          <div className="pt-2 mt-1 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
            {college.employment_highlight && (
              <span className="text-xs text-gray-500">💼 {college.employment_highlight}</span>
            )}
            {college.risk_note && (
              <span className={`text-xs ${tier === 'reach' ? 'text-orange-600' : 'text-gray-500'}`}>
                {tier === 'reach' ? '⚠️' : '💡'} {college.risk_note}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResultsView({ data, userScore, onReset, onRegenerate }) {
  const { analysis, recommendations } = data

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
          ✨ AI志愿推荐报告
        </div>
        <p className="text-2xl font-bold text-gray-900">{userScore} 分的志愿方案</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
        <strong className="text-amber-800">平行志愿填报提示：</strong>
        录取原则为"分数优先、遵循志愿、一轮投档"，被高位次志愿录取后低位次志愿自动失效。
        建议冲稳保各填3条，形成合理梯度，保底院校务必确保能录取。
      </div>

      {analysis && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div>
              <div className="text-xs font-medium text-blue-600 mb-1">顾问分析</div>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis}</p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(TIER).map(([tier, config]) => {
        const colleges = recommendations?.[tier]
        if (!colleges?.length) return null
        return (
          <div key={tier} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.emoji}</span>
              <div>
                <h2 className="font-bold text-gray-900 text-lg leading-none">{config.label}</h2>
                <p className="text-xs text-gray-400">{config.desc}</p>
              </div>
            </div>
            <div className="space-y-3">
              {colleges.map((c, i) => <CollegeCard key={i} college={c} tier={tier} />)}
            </div>
          </div>
        )
      })}

      {!analysis && !Object.values(recommendations ?? {}).some(arr => arr?.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          <p className="font-medium mb-1">AI 返回了空结果</p>
          <p className="text-xs text-yellow-600">请检查终端日志中的 <code>[AI result]</code> 输出，确认模型实际返回了什么内容。</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
        <strong className="text-gray-500">声明：</strong>
        以上推荐仅供参考，录取分数线（含趋势）每年变动，2026年实际数据请以各省教育考试院官方公布为准，建议结合近三年数据和官方位次表做最终决策。
      </div>

      <div className="flex gap-3">
        {onRegenerate && (
          <button onClick={onRegenerate}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm">
            重新生成方案
          </button>
        )}
        <button onClick={onReset}
          className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 transition-all text-sm">
          重新填写信息
        </button>
      </div>
    </div>
  )
}
