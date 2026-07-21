export interface SystemConfig {
  beta_mode: boolean
  registration_enabled?: boolean
}

/** Prepend the backend base URL for raw fetch() calls (not handled by httpClient) */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return `${base}${path}`
}

let configPromise: Promise<SystemConfig> | null = null
let cachedConfig: SystemConfig | null = null

export function getSystemConfig(): Promise<SystemConfig> {
  if (cachedConfig) {
    return Promise.resolve(cachedConfig)
  }
  if (configPromise) {
    return configPromise
  }
  configPromise = fetch(apiUrl('/api/config'))
    .then((res) => res.json())
    .then((data: SystemConfig) => {
      cachedConfig = data
      return data
    })
    .catch((err) => {
      configPromise = null
      console.error('Failed to fetch system config:', err)
      return { beta_mode: false } as SystemConfig
    })
  return configPromise
}
