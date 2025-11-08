export type ApiPayload<T> = {
  data?: string | T
  [key: string]: unknown
}
export type UnzippedPayload<T> = { data: T | null }
export type RequestSuccessful = { data: { success: true } }
