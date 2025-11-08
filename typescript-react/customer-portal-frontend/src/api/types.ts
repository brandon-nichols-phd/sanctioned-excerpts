export interface SelectableItem<T, K extends T = T> {
  source: K
  value: unknown
  label?: string
}
