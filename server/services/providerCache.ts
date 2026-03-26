const cacheEntries = new Map<string, { expiresAt: number; value: unknown }>()
const inflightRequests = new Map<string, Promise<unknown>>()

function getProviderUserAgent() {
  return (
    process.env.EC_PROVIDER_USER_AGENT?.trim() ||
    'Emergency Centre/0.1 (+https://github.com/Ninezel/emergency-centre)'
  )
}

function createHeaders(accept: string | undefined, headers?: RequestInit['headers']) {
  const mergedHeaders = new Headers(headers)

  if (accept && !mergedHeaders.has('Accept')) {
    mergedHeaders.set('Accept', accept)
  }

  if (!mergedHeaders.has('User-Agent')) {
    mergedHeaders.set('User-Agent', getProviderUserAgent())
  }

  return mergedHeaders
}

async function requestUpstream(url: string, accept: string | undefined, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(url, {
      ...init,
      headers: createHeaders(accept, init?.headers),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Upstream request failed with status ${response.status} for ${url}`)
    }

    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function readThroughCache<T>(cacheKey: string, ttlMs: number, loader: () => Promise<T>) {
  const existingEntry = cacheEntries.get(cacheKey)

  if (existingEntry && existingEntry.expiresAt > Date.now()) {
    return existingEntry.value as T
  }

  const existingInflight = inflightRequests.get(cacheKey)

  if (existingInflight) {
    return (await existingInflight) as T
  }

  const nextRequest = loader()
    .then((value) => {
      cacheEntries.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        value,
      })
      inflightRequests.delete(cacheKey)
      return value
    })
    .catch((error) => {
      inflightRequests.delete(cacheKey)
      throw error
    })

  inflightRequests.set(cacheKey, nextRequest as Promise<unknown>)
  return nextRequest
}

export async function fetchCachedJson<T>(
  url: string,
  ttlMs: number,
  init?: RequestInit,
  accept = 'application/json',
) {
  return readThroughCache(`json:${url}`, ttlMs, async () => {
    const response = await requestUpstream(url, accept, init)
    return (await response.json()) as T
  })
}

export async function fetchCachedText(
  url: string,
  ttlMs: number,
  init?: RequestInit,
  accept = 'text/plain, text/html, application/xml, text/xml',
) {
  return readThroughCache(`text:${url}`, ttlMs, async () => {
    const response = await requestUpstream(url, accept, init)
    return response.text()
  })
}
