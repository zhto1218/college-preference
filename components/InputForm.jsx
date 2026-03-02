'use client'

import { useState } from 'react'
import provinceRules from '@/data/province-rules.json'

// 省份分组，方便下拉分组展示
const PROVINCE_GROUPS = [
  { label: '直辖市', items: ['北京', '天津', '上海', '重庆'] },
  { label: '华北', items: ['河北', '山西', '内蒙古'] },
  { label: '东北', items: ['辽宁', '吉林', '黑龙江'] },
  { label: '华东', items: ['江苏', '浙江', '安徽', '福建', '江西', '山东'] },
  { label: '华中', items: ['河南', '湖北', '湖南'] },
  { label: '华南', items: ['广东', '广西', '海南'] },
  { label: '西南', items: ['四川', '贵州', '云南', '西藏'] },
  { label: '西北', items: ['陕西', '甘肃', '青海', '宁夏', '新疆'] },
]

const INTERESTS = ['计算机/软件', '机械/自动化', '医学/护理', '化学/化工', '金融/会计', '师范/教育', '农林/生态', '法学/政治', '艺术/设计', '语言/文学', '管理/商科']

const STEPS = ['基本信息', '志愿偏好', '个人情况']

export default function InputForm({ onSubmit }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    province: '山东',
    score: '',
    subject: 'science',
    preferredCities: [],
    interests: [],
    careerGoal: 'employment',
    rankVsSpecialty: 'balanced',
    economicSituation: 'normal',
    additionalNotes: ''
  })

  const set = (field, value) => setForm(prev => {
    const next = { ...prev, [field]: value }
    // 切换省份时重置城市选择和科目类型（防止科目标签对不上）
    if (field === 'province') {
      next.preferredCities = []
      next.subject = Object.keys(provinceRules[value]?.subjectTypes || { science: 1 })[0]
    }
    return next
  })
  const toggle = (field, item) => setForm(prev => ({
    ...prev,
    [field]: prev[field].includes(item)
      ? prev[field].filter(x => x !== item)
      : [...prev[field], item]
  }))

  const provinceConfig = provinceRules[form.province] || provinceRules['山东']

  const canNext = () => {
    if (step === 0) return form.score !== '' && Number(form.score) >= 200 && Number(form.score) <= 750
    if (step === 1) return form.interests.length > 0
    return true
  }

  const handleSubmit = () => onSubmit({ ...form, score: Number(form.score) })

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8 px-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i === step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">考生所在省份</label>
            <p className="text-xs text-gray-400 mb-2">影响录取规则和投档数据</p>
            <select
              value={form.province}
              onChange={e => set('province', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700 bg-white"
            >
              {PROVINCE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {provinceConfig?.tip && (
              <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
                {provinceConfig.tip}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">科目类型</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(provinceConfig.subjectTypes || {}).map(([value, opt]) => (
                <button key={value} onClick={() => set('subject', value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all
                    ${form.subject === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className="text-2xl block mb-1">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{opt.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">高考分数 <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type="number" value={form.score} onChange={e => set('score', e.target.value)}
                placeholder="例如：550" min="200" max="750"
                className="w-full px-4 py-3 text-xl border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">分</span>
            </div>
            {form.score && (Number(form.score) < 200 || Number(form.score) > 750) && (
              <p className="text-red-500 text-sm mt-1">分数应在200-750之间</p>
            )}
          </div>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">意向城市 <span className="text-gray-400 font-normal text-xs">可多选</span></label>
            <div className="flex flex-wrap gap-2">
              {(provinceConfig.targetCities || []).map(city => (
                <button key={city} onClick={() => toggle('preferredCities', city)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all
                    ${form.preferredCities.includes(city) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">兴趣方向 <span className="text-red-400">*</span> <span className="text-gray-400 font-normal text-xs">至少选1个</span></label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => toggle('interests', interest)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all
                    ${form.interests.includes(interest) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">毕业目标</label>
            <div className="space-y-2">
              {[
                { value: 'employment', label: '以就业为主', desc: '毕业后直接找好工作' },
                { value: 'grad', label: '以深造为主', desc: '打算考研/出国深造' },
                { value: 'both', label: '灵活，两者都行', desc: '视情况而定' },
              ].map(opt => (
                <button key={opt.value} onClick={() => set('careerGoal', opt.value)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all
                    ${form.careerGoal === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`font-medium text-sm ${form.careerGoal === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">你更看重什么？</label>
            <div className="space-y-2">
              {[
                { value: 'rank', label: '更看重学校排名/名气', desc: '宁可专业差一点，学校要有知名度' },
                { value: 'specialty', label: '更看重专业实力', desc: '专业强的学校，排名低一点也行' },
                { value: 'balanced', label: '学校和专业都重要', desc: '希望两者兼顾' },
              ].map(opt => (
                <button key={opt.value} onClick={() => set('rankVsSpecialty', opt.value)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all
                    ${form.rankVsSpecialty === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`font-medium text-sm ${form.rankVsSpecialty === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">家庭经济情况</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'tight', label: '较紧张', emoji: '💸' }, { value: 'normal', label: '一般', emoji: '💰' }, { value: 'good', label: '较好', emoji: '💎' }].map(opt => (
                <button key={opt.value} onClick={() => set('economicSituation', opt.value)}
                  className={`p-3 rounded-xl border-2 text-center text-sm transition-all
                    ${form.economicSituation === opt.value ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className="text-xl block mb-1">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">补充说明 <span className="text-gray-400 font-normal text-xs">选填</span></label>
            <textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)}
              placeholder="例如：想留在本省、有特定职业目标、身体健康限制等..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 transition-all">
            上一步
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-semibold
              hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            下一步
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canNext()}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-semibold
              hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            生成志愿推荐 →
          </button>
        )}
      </div>
    </div>
  )
}
