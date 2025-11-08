import { debounce } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'

type SingleParamCallback<PType, RType> = (params: PType) => RType

export const useDebounce = <PType, RType>(callback: SingleParamCallback<PType, RType>) => {
  const currentCallback = useRef<SingleParamCallback<PType, RType>>(callback)

  // Keep a reference to the most recent callback at all times since we don't know when the debounce will
  // actually occur. We always want the most recent version because it might have some internal references
  // tied to their closure.
  useEffect(() => {
    currentCallback.current = callback
  }, [callback])

  // Call debounce only the first time and make it point to the callback reference.
  const debouncedCallback = useMemo(() => {
    const pointerToCallback = (params: PType) => {
      return currentCallback.current(params)
    }
    return debounce(pointerToCallback, 200)
  }, [])

  // Make sure to cancel the debounced callback when unmounting the component.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `debouncedCallback` never changes
  useEffect(() => debouncedCallback.cancel, [])

  return debouncedCallback
}
