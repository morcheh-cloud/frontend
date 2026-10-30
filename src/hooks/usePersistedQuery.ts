import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query"
import localforage from "localforage"
import { useEffect, useState } from "react"

const CACHE_PREFIX = "morcheh"
const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 30 // 30 days

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// IndexedDB stores values with the structured clone algorithm, which rejects
// functions and the class instances that carry them. A queryFn returning a raw
// axios response trips this (`config.transformRequest`, the `AxiosHeaders`
// instance, the underlying XHR in `request`). Round-tripping through JSON drops
// everything non-serializable; API payloads are already plain JSON, so the part
// consumers actually read survives intact.
function toStorable<T>(value: T): T | undefined {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return undefined
  }
}

type UsePersistedQueryOptions<TData, TError = Error> = Omit<
  UseQueryOptions<TData, TError>,
  "placeholderData"
> & {
  ttl?: number
}

function usePersistedQuery<TData, TError = Error>({
  ttl = DEFAULT_TTL,
  ...queryOptions
}: UsePersistedQueryOptions<TData, TError>): UseQueryResult<TData, TError> {
  const storageKey = `${CACHE_PREFIX}_${queryOptions.queryKey.join("_")}`
  // biome-ignore lint/suspicious/noExplicitAny: a TData-typed placeholder breaks useQuery's overload resolution.
  const [placeholder, setPlaceholder] = useState<any>(undefined)

  // Whether the async localforage cache read has finished. Until it does we
  // can't yet know if there's persisted data to show, so we must treat the
  // hook as loading — otherwise consumers observe `isLoading === false` with
  // `data === undefined` (an empty flash) before the cache/query resolves.
  const [hydrated, setHydrated] = useState(false)

  // Read cache from localforage once on mount (effects only run in the browser)
  useEffect(() => {
    let cancelled = false
    localforage
      .getItem<CacheEntry<TData>>(storageKey)
      .then((entry) => {
        if (cancelled || !entry) return
        if (Date.now() - entry.timestamp > ttl) {
          localforage.removeItem(storageKey).catch(() => {})
          return
        }

        setPlaceholder(entry.data)
      })
      .catch((e) => {
        console.error(
          `Error occurred while fetching cached data for key ${storageKey}:`,
          e,
        )
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [storageKey, ttl])

  const result = useQuery<TData, TError>({
    ...queryOptions,
    placeholderData: placeholder,
  })

  // Write fresh data back to localforage (never write placeholder data back)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (result.data === undefined || result.isPlaceholderData) return

    const payload = toStorable(result.data)
    if (payload === undefined) {
      console.warn(
        `Query data for key ${storageKey} is not serializable — skipping persist`,
      )
      return
    }

    const entry: CacheEntry<TData> = { data: payload, timestamp: Date.now() }
    localforage
      .setItem(storageKey, entry)
      .then(() => {
        console.info(`Persisted query data for key ${storageKey}`)
      })
      .catch((e) => {
        console.warn(`Failed to persist query data for key ${storageKey}:`, e)
      })
  }, [result.data, result.isPlaceholderData, storageKey])

  // Bridge the async hydration gap: while the cache read is still in-flight and
  // the query hasn't produced data yet, report a loading state so consumers
  // don't render an empty result that fills in "a moment later".
  if (!hydrated && result.data === undefined) {
    return { ...result, isLoading: true, isPending: true } as UseQueryResult<
      TData,
      TError
    >
  }

  return result
}

export default usePersistedQuery
