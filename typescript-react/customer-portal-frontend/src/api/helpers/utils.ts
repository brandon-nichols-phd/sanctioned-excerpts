import { SelectableItem } from '../types'

export const isNumberOrString = (value: unknown): value is number | string => {
  return (typeof value === 'number' || typeof value === 'string') && !Array.isArray(value)
}

export const toSelectableItem = <T = unknown>(item: T, label: string, value: T | Partial<T>): SelectableItem<T> => {
  const selectableItem: SelectableItem<T> = {
    source: item,
    label,
    value: value,
  }
  return selectableItem
}
