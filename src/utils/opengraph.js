const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi

const _cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

export function detectUrls (text) {
  if (!text || typeof text !== 'string') return []
  const matches = text.match(URL_REGEX)
  if (!matches) return []
  return [...new Set(matches)].map(url => {
    let cleaned = url
    try {
      const parsed = new URL(cleaned)
      if (!['http:', 'https:'].includes(parsed.protocol)) return null
      cleaned = parsed.href
    } catch {
      return null
    }
    return cleaned
  }).filter(Boolean)
}

export function extractFirstUrl (text) {
  const urls = detectUrls(text)
  return urls.length > 0 ? urls[0] : null
}

function getCacheKey (url) {
  return url
}

function getFromCache (url) {
  const entry = _cache.get(getCacheKey(url))
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    _cache.delete(getCacheKey(url))
    return null
  }
  return entry.data
}

function setCache (url, data) {
  if (_cache.size > 200) {
    const oldest = _cache.keys().next().value
    _cache.delete(oldest)
  }
  _cache.set(getCacheKey(url), { data, timestamp: Date.now() })
}

function parseMetaContent (html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const getMeta = (property) => {
    const el =
      doc.querySelector(`meta[property="${property}"]`) ||
      doc.querySelector(`meta[name="${property}"]`)
    return el?.getAttribute('content')?.trim() || ''
  }

  const ogTitle = getMeta('og:title')
  const ogDescription = getMeta('og:description')
  const ogImage = getMeta('og:image')
  const ogSiteName = getMeta('og:site_name')
  const ogUrl = getMeta('og:url')

  const title = ogTitle || doc.querySelector('title')?.textContent?.trim() || ''
  const description = ogDescription || getMeta('description') || ''

  let imageUrl = ogImage
  if (imageUrl && !imageUrl.startsWith('http')) {
    try {
      const base = new URL(doc.querySelector('base')?.href || '')
      imageUrl = new URL(imageUrl, base).href
    } catch {
      imageUrl = ''
    }
  }

  return {
    url: ogUrl,
    title,
    description,
    imageUrl,
    siteName: ogSiteName,
  }
}

export async function fetchOpenGraph (url, { timeout = 8000 } = {}) {
  const cached = getFromCache(url)
  if (cached) return cached

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/html' },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('Not HTML')
    }

    const html = await response.text()
    const meta = parseMetaContent(html)

    const result = {
      url,
      title: meta.title || '',
      description: meta.description || '',
      imageUrl: meta.imageUrl || '',
      siteName: meta.siteName || '',
    }

    setCache(url, result)
    return result
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { url, title: '', description: '', imageUrl: '', siteName: '' }
    }
    const fallback = { url, title: '', description: '', imageUrl: '', siteName: '' }
    setCache(url, fallback)
    return fallback
  } finally {
    clearTimeout(timer)
  }
}
