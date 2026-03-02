import { readFileSync } from 'fs'
import { join } from 'path'

export const PROVINCE_KEYS = {
  '山东': 'shandong',
  '河北': 'hebei',
  '北京': 'beijing',
  '天津': 'tianjin',
  '上海': 'shanghai',
  '重庆': 'chongqing',
  '浙江': 'zhejiang',
  '江苏': 'jiangsu',
  '广东': 'guangdong',
  '福建': 'fujian',
  '湖北': 'hubei',
  '湖南': 'hunan',
  '辽宁': 'liaoning',
  '安徽': 'anhui',
  '吉林': 'jilin',
  '黑龙江': 'heilongjiang',
  '贵州': 'guizhou',
  '甘肃': 'gansu',
  '广西': 'guangxi',
  '海南': 'hainan',
  '河南': 'henan',
  '山西': 'shanxi',
  '内蒙古': 'neimenggu',
  '陕西': 'shaanxi',
  '四川': 'sichuan',
  '云南': 'yunnan',
  '江西': 'jiangxi',
  '新疆': 'xinjiang',
  '西藏': 'xizang',
  '宁夏': 'ningxia',
  '青海': 'qinghai',
}

export function loadColleges() {
  return JSON.parse(readFileSync(join(process.cwd(), 'data', 'colleges.json'), 'utf-8'))
}

export function loadProvinceRules() {
  return JSON.parse(readFileSync(join(process.cwd(), 'data', 'province-rules.json'), 'utf-8'))
}

// 获取 admission 数据中最近3个年份（降序）
function getRecentYears(admData) {
  if (!admData) return []
  return Object.keys(admData).map(Number).sort((a, b) => b - a).slice(0, 3).map(String)
}

// 获取院校在指定省份+科目的 admission 数据，无则降级到 national，再降级到第一个可用省份
export function getAdmData(college, provKey, subject) {
  return college.admission[provKey]?.[subject]
    || college.admission['national']?.[subject]
    || college.admission['shandong']?.[subject]
    || college.admission['hebei']?.[subject]
    || null
}

export function filterColleges({ score, subject = 'science', examProvince = '山东' }) {
  const { colleges } = loadColleges()
  const provKey = PROVINCE_KEYS[examProvince] || 'shandong'
  const margin = 50

  const getLatestScore = (c) => {
    const admData = getAdmData(c, provKey, subject)
    const years = getRecentYears(admData)
    return years.length > 0 ? admData[years[0]] : null
  }

  const relevant = colleges.filter(c => {
    const s = getLatestScore(c)
    if (s == null) return false
    return s >= score - margin && s <= score + margin
  })

  relevant.sort((a, b) => (getLatestScore(b) ?? 0) - (getLatestScore(a) ?? 0))

  if (relevant.length > 0) return relevant

  // 无匹配时，返回该省有数据的前20所（按分数排序）
  const withData = colleges.filter(c => getLatestScore(c) != null)
  withData.sort((a, b) => (getLatestScore(b) ?? 0) - (getLatestScore(a) ?? 0))
  return withData.slice(0, 20)
}

export function buildCollegeContext(colleges, subject = 'science', examProvince = '山东') {
  const provKey = PROVINCE_KEYS[examProvince] || 'shandong'
  return colleges.map(c => {
    const admData = getAdmData(c, provKey, subject)
    const isNationalFallback = !c.admission[provKey]?.[subject] && admData != null
    const years = getRecentYears(admData)
    const [y0, y1, y2] = years
    const s0 = admData?.[y0] ?? 'N/A'
    const s1 = admData?.[y1] ?? 'N/A'
    const s2 = admData?.[y2] ?? 'N/A'
    const trend = (s0 !== 'N/A' && s2 !== 'N/A')
      ? (s0 - s2 > 3 ? '↑涨' : s2 - s0 > 3 ? '↓降' : '→稳')
      : ''
    const yearLabel = years.length > 0 ? years.join('/') : '—'
    const dataNote = isNationalFallback ? '（参考全国均线）' : ''
    return `【${c.name}】(${c.type}) 地点:${c.city} 类别:${c.category}
  近3年在${examProvince}录取线: ${s0}/${s1}/${s2}（${yearLabel}）${trend}${dataNote}
  强势专业: ${c.strongMajors.join('、')}
  就业率:${(c.employment.rate * 100).toFixed(0)}% 考研率:${(c.employment.grad_rate * 100).toFixed(0)}% 均薪:${c.employment.avg_salary}元
  特点: ${c.features.join('、')}
  学费: ${c.tuition}元/年`
  }).join('\n\n')
}
