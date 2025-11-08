// Amplitude.ts
import * as amplitude from '@amplitude/analytics-browser'

const truthValues = new Set(['true', '1', 'yes'])

const ProdFlag = [process.env.REACT_APP_IS_PROD, process.env.IS_PROD].find((value) => value != null)
const isEnvProd = ProdFlag ? truthValues.has(ProdFlag.toLowerCase()) : undefined

const isProd = isEnvProd ?? false

const API_KEY = process.env.REACT_APP_AMPLITUDE_API_KEY ?? (isProd ? PROD_API_KEY : NON_PROD_API_KEY)

let initialized = false

export function ensureAmplitudeInit() {
  if (initialized || !API_KEY) return
  initialized = true

  const doInit = () => {
    amplitude.init(API_KEY, undefined, {
      // keep the observers minimal to avoid MutationObserver issues
      defaultTracking: { sessions: true, pageViews: true, formInteractions: false, fileDownloads: false },
      // 👇 allow short ids like "3000"
      minIdLength: 1,
    })
  }

  if (typeof document !== 'undefined' && document.body) doInit()
  else window.addEventListener('DOMContentLoaded', doInit, { once: true })
}

// Never set empty userIds
export function setUserIdSafe(id?: string | number | null) {
  const uid = (id != null ? String(id) : '').trim()
  amplitude.setUserId(uid || undefined)
}

export default amplitude
export const Identify = amplitude.Identify
