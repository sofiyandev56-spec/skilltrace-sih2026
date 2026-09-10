import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small data-fetching hook: keeps the previous value on screen while a
 * refetch is in flight so the dashboard does not flash empty on every
 * filter change.
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const alive = useRef(true)
  const seq = useRef(0)

  const run = useCallback(async () => {
    const me = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetcher()
      if (!alive.current || me !== seq.current) return
      setState({ data, loading: false, error: null })
    } catch (err) {
      if (!alive.current || me !== seq.current) return
      setState((s) => ({ data: s.data, loading: false, error: err.message || String(err) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    alive.current = true
    run()
    return () => {
      alive.current = false
    }
  }, [run])

  return { ...state, reload: run }
}

/** Closes a popover/menu when the user clicks outside it or presses Escape. */
export function useDismiss(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onDismiss()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onDismiss, active])
}
