import { useEffect, useState } from "react"

// `value`, once it has stayed the same for `ms` (for requests made while
// someone types).
export function useDebounced<T>(value: T, ms = 400) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}
