import { filterColleges, buildCollegeContext, loadProvinceRules, loadColleges, PROVINCE_KEYS, getAdmData } from './dataLoader'

// Enrich AI recommendations with real admission data from our database
function enrichWithRealData(result, examProvince, subject) {
  const { colleges } = loadColleges()
  const provKey = PROVINCE_KEYS[examProvince] || 'shandong'

  const enrich = (item) => {
    const college = colleges.find(c =>
      c.name === item.name ||
      item.name?.includes(c.name) ||
      c.name?.includes(item.name)
    )
    if (!college) return item
    const admData = getAdmData(college, provKey, subject)
    if (!admData) return item
    // 动态取最近3个年份（降序）
    const years = Object.keys(admData).map(Number).sort((a, b) => b - a).slice(0, 3).map(String)
    const [y0, y1, y2] = years
    const s0 = admData[y0], s1 = admData[y1], s2 = admData[y2]
    const trend = (s0 && s2) ? (s0 - s2 > 3 ? '↑' : s2 - s0 > 3 ? '↓' : '→') : ''
    return {
      ...item,
      admission_score: s0 || item.admission_score,
      admission_year0: y0, admission_score_1: s1, admission_year1: y1,
      admission_score_2: s2, admission_year2: y2,
      admission_trend: trend,
      // major 为空时从数据库强势专业补充
      major: item.major || college.strongMajors?.[0] || '',
    }
  }

  const safeArr = (arr) => Array.isArray(arr) ? arr : []
  return {
    ...result,
    recommendations: {
      reach: safeArr(result.recommendations?.reach).map(enrich),
      match: safeArr(result.recommendations?.match).map(enrich),
      safety: safeArr(result.recommendations?.safety).map(enrich),
    }
  }
}

// 当某个梯度学校不足3所时，从数据库补充（避免重复）
function fillMissingTiers(result, score, dbColleges, examProvince, subject) {
  const provKey = PROVINCE_KEYS[examProvince] || 'shandong'

  const usedNames = new Set()
  for (const arr of Object.values(result.recommendations)) {
    for (const c of arr) usedNames.add(c.name)
  }

  const getScore = (c) => {
    const admData = getAdmData(c, provKey, subject)
    if (!admData) return null
    const years = Object.keys(admData).map(Number).sort((a, b) => b - a)
    return years.length > 0 ? admData[String(years[0])] : null
  }

  const buildFromDB = (c) => {
    const admData = getAdmData(c, provKey, subject)
    const years = Object.keys(admData || {}).map(Number).sort((a, b) => b - a).slice(0, 3).map(String)
    const [y0, y1, y2] = years
    const s0 = admData?.[y0], s1 = admData?.[y1], s2 = admData?.[y2]
    const trend = (s0 && s2) ? (s0 - s2 > 3 ? '↑' : s2 - s0 > 3 ? '↓' : '→') : ''
    const reasons = [...(c.features?.slice(0, 2) || [])]
    if (c.strongMajors?.length > 0) reasons.push(`强势专业：${c.strongMajors.slice(0, 2).join('、')}`)
    return {
      name: c.name,
      type: c.type || c.tags?.[0] || '',
      city: c.city || '',
      major: c.strongMajors?.[0] || '',
      reasons: reasons.slice(0, 3),
      employment_highlight: c.employment
        ? `就业率${(c.employment.rate * 100).toFixed(0)}%，均薪${c.employment.avg_salary}元`
        : '',
      risk_note: '',
      admission_score: s0 || 0,
      admission_year0: y0,
      admission_score_1: s1,
      admission_year1: y1,
      admission_score_2: s2,
      admission_year2: y2,
      admission_trend: trend,
    }
  }

  // 非重叠区间：reach >= score+3, match: [score-20, score+3), safety < score-15
  const inTier = {
    reach:  (s) => s >= score + 3,
    match:  (s) => s >= score - 20 && s < score + 3,
    safety: (s) => s < score - 15,
  }

  const sorted = {
    reach:  [...dbColleges].filter(c => { const s = getScore(c); return s != null && inTier.reach(s) })
                           .sort((a, b) => getScore(a) - getScore(b)),   // 最容易冲到的排前面
    match:  [...dbColleges].filter(c => { const s = getScore(c); return s != null && inTier.match(s) })
                           .sort((a, b) => Math.abs(getScore(a) - score) - Math.abs(getScore(b) - score)),
    safety: [...dbColleges].filter(c => { const s = getScore(c); return s != null && inTier.safety(s) })
                           .sort((a, b) => getScore(b) - getScore(a)),   // 分最高的保底排前
  }

  for (const tier of ['reach', 'match', 'safety']) {
    const current = result.recommendations[tier]
    if (current.length >= 3) continue
    const needed = 3 - current.length
    const candidates = sorted[tier].filter(c => !usedNames.has(c.name))
    for (const c of candidates.slice(0, needed)) {
      current.push(buildFromDB(c))
      usedNames.add(c.name)
    }
  }

  return result
}

// 单个院校的 JSON Schema（用于 function calling）
const COLLEGE_ITEM_SCHEMA = {
  type: 'object',
  required: ['name', 'type', 'city', 'major', 'reasons', 'employment_highlight', 'risk_note'],
  additionalProperties: false,
  properties: {
    name:                 { type: 'string', description: '院校全称' },
    type:                 { type: 'string', description: '985/211/省属重点/省属本科' },
    city:                 { type: 'string', description: '所在城市' },
    major:                { type: 'string', description: '推荐专业（只写一个专业名称）' },
    reasons:              { type: 'array', items: { type: 'string' }, description: '推荐理由2-3条' },
    employment_highlight: { type: 'string', description: '就业或考研亮点' },
    risk_note:            { type: 'string', description: '注意事项或风险提示' },
  },
}

// Function calling 工具定义
const RECOMMENDATION_TOOL = {
  type: 'function',
  function: {
    name: 'submit_recommendations',
    description: '提交高考志愿冲稳保推荐结果（reach/match/safety各3条）',
    parameters: {
      type: 'object',
      required: ['analysis', 'recommendations'],
      properties: {
        analysis: { type: 'string', description: '对学生情况的分析，2-3句话' },
        recommendations: {
          type: 'object',
          required: ['reach', 'match', 'safety'],
          properties: {
            reach:  { type: 'array', items: COLLEGE_ITEM_SCHEMA, description: '冲一冲院校，填3条' },
            match:  { type: 'array', items: COLLEGE_ITEM_SCHEMA, description: '稳一稳院校，填3条' },
            safety: { type: 'array', items: COLLEGE_ITEM_SCHEMA, description: '保一保院校，填3条' },
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `你是一位专业的高考志愿填报顾问。根据学生情况从给定高校数据中给出个性化的冲/稳/保志愿推荐。

【志愿填报规则】
- 各省均采用平行志愿，录取原则：分数优先、遵循志愿、一轮投档
- 冲一冲（reach）：录取线比学生分数高5-20分，有挑战性但值得尝试
- 稳一稳（match）：录取线与学生分数相近（±5分），较有把握
- 保一保（safety）：录取线比学生分数低10-25分，作为保底确保录取
- 冲稳保各3条，整体保持合理梯度，只从给定高校数据中选择，不得编造院校名称。`

// Auto-detect provider from available keys, or use AI_PROVIDER explicitly
function detectProvider() {
  const explicit = process.env.AI_PROVIDER
  if (explicit) return explicit

  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GEMINI_API_KEY) return 'gemini'

  throw new Error('未配置 API Key。请在 .env.local 中设置 ANTHROPIC_API_KEY、OPENAI_API_KEY 或 GEMINI_API_KEY')
}

// OpenAI-compatible 调用：优先 function calling（强制字段名），失败则降级为文本
async function callOpenAICompatible(client, model, systemPrompt, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages,
      tools: [RECOMMENDATION_TOOL],
      tool_choice: { type: 'function', function: { name: 'submit_recommendations' } },
    })
    const args = completion.choices[0].message.tool_calls?.[0]?.function?.arguments
    if (args) return args  // 已是正确字段名的 JSON 字符串
  } catch {
    // 代理不支持 function calling，降级为普通文本
  }
  const completion = await client.chat.completions.create({ model, max_tokens: 4096, messages })
  const content = completion?.choices?.[0]?.message?.content
  if (!content) {
    const raw = JSON.stringify(completion).slice(0, 300)
    const hint = raw.includes('<!doctype') || raw.includes('<html')
      ? '返回了 HTML 页面，BASE_URL 路径不对，通常需要加 /v1'
      : `返回格式异常: ${raw}`
    throw new Error(hint)
  }
  return content
}

async function callAnthropic(systemPrompt, userMessage) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const opts = { apiKey: process.env.ANTHROPIC_API_KEY }
  if (process.env.ANTHROPIC_BASE_URL) opts.baseURL = process.env.ANTHROPIC_BASE_URL
  const client = new Anthropic(opts)
  // 优先使用 tool_use 强制字段名
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [{ name: RECOMMENDATION_TOOL.function.name, description: RECOMMENDATION_TOOL.function.description, input_schema: RECOMMENDATION_TOOL.function.parameters }],
      tool_choice: { type: 'tool', name: RECOMMENDATION_TOOL.function.name },
      messages: [{ role: 'user', content: userMessage }],
    })
    const toolUse = msg.content.find(c => c.type === 'tool_use')
    if (toolUse?.input) return JSON.stringify(toolUse.input)
  } catch {
    // 降级为文本
  }
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  return msg.content[0].text
}

async function callOpenAI(systemPrompt, userMessage) {
  const { default: OpenAI } = await import('openai')
  const opts = { apiKey: process.env.OPENAI_API_KEY }
  if (process.env.OPENAI_BASE_URL) opts.baseURL = process.env.OPENAI_BASE_URL
  const client = new OpenAI(opts)
  return callOpenAICompatible(client, process.env.OPENAI_MODEL || 'gpt-5.2', systemPrompt, userMessage)
}

async function callGemini(systemPrompt, userMessage) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  if (process.env.GEMINI_BASE_URL) {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: process.env.GEMINI_BASE_URL })
    return callOpenAICompatible(client, modelName, systemPrompt, userMessage)
  }

  // 无中转时用原生 Google SDK（不支持 function calling，直接文本）
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt })
  const result = await model.generateContent(userMessage)
  return result.response.text()
}

function buildUserMessage(userInfo, context) {
  const {
    score,
    subject = 'science',
    province = '山东',
    preferredCities = [],
    interests = [],
    careerGoal = 'employment',
    rankVsSpecialty = 'balanced',
    economicSituation = 'normal',
    additionalNotes = ''
  } = userInfo

  const provinceRules = loadProvinceRules()
  const rule = provinceRules[province] || provinceRules['山东']
  const subjectLabel = rule.subjectTypes[subject] || (subject === 'science' ? '理科' : '文科')
  const citiesLabel = preferredCities.length > 0 ? preferredCities.join('、') : '不限'
  const interestsLabel = interests.length > 0 ? interests.join('、') : '不限'
  const careerLabel = { employment: '偏向就业', grad: '偏向深造考研', both: '就业和深造均可' }[careerGoal]
  const rankLabel = { rank: '更注重学校排名', specialty: '更注重专业实力', balanced: '学校和专业并重' }[rankVsSpecialty]
  const ecoLabel = { tight: '经济较紧张，优先本省低学费', normal: '经济一般', good: '经济较好，可考虑外省' }[economicSituation]

  return `## 学生情况：
- 考生省份：${province}（${rule.tip}）
- 志愿模式：${rule.mode}，科目：${subjectLabel}，分数：${score}分
- 意向城市：${citiesLabel}
- 兴趣方向：${interestsLabel}
- 目标：${careerLabel}
- 择校偏好：${rankLabel}
- 家庭经济：${ecoLabel}
${additionalNotes ? `- 补充：${additionalNotes}` : ''}

## 可选高校数据（以下院校均有${province}投档线数据）：
${context}

请输出推荐JSON：`
}

// Classify a judgement string to reach/match/safety
function classifyTier(judgement = '') {
  const s = judgement.toLowerCase()
  if (/冲|挑战|风险|较难|困难/.test(s)) return 'reach'
  if (/保|稳妥|把握|保底/.test(s)) return 'safety'
  return 'match'
}

// 模糊匹配：在 item 的所有 key 中找第一个 key 包含指定关键词的值（字符串）
function fuzzyPick(item, keywords) {
  const kws = keywords.map(k => k.toLowerCase())
  for (const [k, v] of Object.entries(item)) {
    const lk = k.toLowerCase()
    if (kws.some(kw => lk.includes(kw))) {
      if (Array.isArray(v) && v.length > 0) return String(v[0])
      if (typeof v === 'string' && v) return v
    }
  }
  return ''
}

// 模糊收集：收集所有 key 包含指定关键词的字符串值到数组
function fuzzyCollect(item, keywords) {
  const kws = keywords.map(k => k.toLowerCase())
  const out = []
  for (const [k, v] of Object.entries(item)) {
    const lk = k.toLowerCase()
    if (kws.some(kw => lk.includes(kw))) {
      if (Array.isArray(v)) v.forEach(s => { if (typeof s === 'string' && s) out.push(s) })
      else if (typeof v === 'string' && v) out.push(v)
    }
  }
  return out
}

// Normalize a single college item to the expected field names
function normalizeCollegeItem(item) {
  // --- reasons: 优先取 reasons 字段，否则模糊收集 reason/fit/analysis/why 相关字段 ---
  let reasons = []
  if (item.fit_analysis && typeof item.fit_analysis === 'object') {
    Object.values(item.fit_analysis).forEach(v => { if (v) reasons.push(String(v)) })
  }
  if (Array.isArray(item.reasons) && item.reasons.length) {
    reasons.push(...item.reasons.map(String))
  } else if (typeof item.reasons === 'string' && item.reasons) {
    reasons.push(item.reasons)
  }
  if (reasons.length === 0) {
    reasons = fuzzyCollect(item, ['reason', 'fit_for', 'fit_analysis', 'analysis', 'why', 'rationale', 'highlight', '理由', '优势', '推荐原因'])
  }

  // Match any score_reference_* field
  const scoreRef = Object.entries(item).find(([k]) => k.startsWith('score_reference'))?.[1]

  return {
    name: item.name || item.university || item.school || item.college ||
          item['院校名称'] || item['学校名称'] || item['院校'] || '未知',
    type: item.type ||
          (typeof item.tag === 'string' ? item.tag : null) ||
          (item.tags || item.tier_tags || [])[0] ||
          item.category || item.tier ||
          fuzzyPick(item, ['type', 'tag', 'tier', 'category', '类型', '层次', '类别']) ||
          '',
    city: item.city || item.location || item['城市'] || item['所在城市'] || '',
    major: item.major || item.recommended_major || item.suggested_major ||
           (Array.isArray(item.recommended_majors) ? item.recommended_majors[0] : (typeof item.recommended_majors === 'string' ? item.recommended_majors : '')) ||
           (Array.isArray(item.suggested_majors) ? item.suggested_majors[0] : (typeof item.suggested_majors === 'string' ? item.suggested_majors : '')) ||
           fuzzyPick(item, ['major', 'specialty', 'programme', '专业']) ||
           '',
    admission_score: item.admission_score || item.score_line || scoreRef ||
                     item.admission_info?.score_2023 ||
                     item['录取分数线'] || item['录取线'] || 0,
    reasons: reasons.slice(0, 3),
    employment_highlight: item.employment_highlight || item.employment_outlook ||
                          item.employment || item.career ||
                          fuzzyPick(item, ['employment', 'career', 'job', '就业', '职业']) ||
                          '',
    risk_note: item.risk_note || item.risk_assessment || item.admission_probability?.reason ||
               item.caution || item.warning ||
               fuzzyPick(item, ['risk', 'caution', 'warning', 'note', '风险', '注意', '提示']) ||
               ''
  }
}

// Find the recommendations object/array from any top-level key the model might use
function findRecs(parsed) {
  // Prefer the correct key first
  if (parsed.recommendations) return parsed.recommendations
  // Common alternative keys models use
  const altKeys = ['recommended_volunteers', 'volunteer_recommendations', 'colleges',
                   'suggested_colleges', 'results', '推荐', '志愿推荐', '推荐院校']
  for (const k of altKeys) {
    if (parsed[k]) return parsed[k]
  }
  // Last resort: find any object value that has reach/match/safety keys
  for (const v of Object.values(parsed)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && (v.reach || v.match || v.safety)) return v
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v
  }
  return null
}

// Normalize any model output to the expected {analysis, recommendations:{reach,match,safety}} shape
function normalizeResponse(parsed) {
  const recs = findRecs(parsed)

  // recommendations is an object with reach/match/safety keys (with or without analysis field)
  if (recs && !Array.isArray(recs) && (recs.reach || recs.match || recs.safety)) {
    // Extract analysis from wherever the model put it
    const sp = parsed.student_profile
    const analysis = parsed.analysis ||
      (typeof parsed.strategy === 'string' ? parsed.strategy : parsed.strategy?.summary || parsed.strategy?.overview) ||
      (sp ? `${sp.score || sp.total_score || ''}分${sp.subject || sp.track ? `（${sp.subject || sp.track}）` : ''}，已为您生成个性化志愿推荐方案。` : '已为您生成个性化志愿推荐方案。')
    return {
      analysis,
      recommendations: {
        reach: (recs.reach || []).map(normalizeCollegeItem).slice(0, 3),
        match: (recs.match || []).map(normalizeCollegeItem).slice(0, 3),
        safety: (recs.safety || []).map(normalizeCollegeItem).slice(0, 3),
      }
    }
  }

  // Convert array-based format
  if (Array.isArray(recs)) {
    const buckets = { reach: [], match: [], safety: [] }

    for (const item of recs) {
      const tier = classifyTier(
        item.admission_probability?.judgement ||
        item.admission_risk || item.tier || item.category ||
        item.match_result?.tier || item['冲稳保'] || ''
      )
      buckets[tier].push(normalizeCollegeItem(item))
    }

    // If tier classification failed (all in match), redistribute by position
    const total = recs.length
    if (buckets.reach.length === 0 && buckets.safety.length === 0 && total >= 3) {
      buckets.reach = buckets.match.slice(0, 3)
      buckets.match = buckets.match.slice(3, 6)
      buckets.safety = buckets.match.slice(6, 9)
    }

    buckets.reach = buckets.reach.slice(0, 3)
    buckets.match = buckets.match.slice(0, 3)
    buckets.safety = buckets.safety.slice(0, 3)

    const sp = parsed.student_profile
    const analysis = sp
      ? `该生${sp.track || ''}${sp.score || ''}分，意向城市${sp.preferred_city || '不限'}，目标${sp.goal || ''}。`
      : parsed.final_suggestion || parsed.summary || '已为您生成个性化志愿推荐方案。'

    return { analysis, recommendations: buckets }
  }

  // 兜底：无论 AI 返回什么结构，保证输出有 reach/match/safety
  console.warn('[AI normalizer] unexpected format, keys:', Object.keys(parsed))
  return {
    analysis: parsed.analysis || parsed.summary || '已为您生成个性化志愿推荐方案。',
    recommendations: { reach: [], match: [], safety: [] }
  }
}

export async function getRecommendations(userInfo) {
  const { score, subject = 'science', province = '山东' } = userInfo
  const colleges = filterColleges({ score, subject, examProvince: province })
  const context = buildCollegeContext(colleges, subject, province)
  const userMessage = buildUserMessage(userInfo, context)

  const provider = detectProvider()
  let text

  if (provider === 'anthropic') {
    text = await callAnthropic(SYSTEM_PROMPT, userMessage)
  } else if (provider === 'openai') {
    text = await callOpenAI(SYSTEM_PROMPT, userMessage)
  } else if (provider === 'gemini') {
    text = await callGemini(SYSTEM_PROMPT, userMessage)
  } else {
    throw new Error(`不支持的 AI_PROVIDER: ${provider}。请使用 anthropic、openai 或 gemini`)
  }

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI返回格式异常，请重试')
  const parsed = JSON.parse(match[0])
  const result = normalizeResponse(parsed)
  const enriched = enrichWithRealData(result, province, subject)
  return fillMissingTiers(enriched, score, colleges, province, subject)
}
