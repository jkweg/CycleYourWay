const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return UUID_PATTERN.test(String(value || '').trim())
}

export function buildShareUrl(origin, token) {
  if (!isUuid(token)) throw new Error('Invalid share token')
  const url = new URL(origin)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  url.searchParams.set('share', token)
  return url.toString()
}
