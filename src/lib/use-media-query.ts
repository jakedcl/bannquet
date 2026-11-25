import {useSyncExternalStore} from 'react'

/** Whether a CSS media query matches right now, updating as it changes. `serverValue` is used for the server's HTML. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}
