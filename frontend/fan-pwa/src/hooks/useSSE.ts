/**
 * useSSE — Server-Sent Events hook for real-time reroute broadcasts.
 * Connects to /api/sse/reroute and maintains reconnect logic.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { BroadcastEvent } from '../types'

export type SSEStatus = 'connecting' | 'connected' | 'reconnecting' | 'error'

interface UseSSEResult {
  status: SSEStatus
  latestEvent: BroadcastEvent | null
  dismiss: () => void
}

const SSE_URL = '/api/sse/reroute'
const MAX_RETRY_DELAY = 30_000  // 30 seconds max

export function useSSE(): UseSSEResult {
  const [status, setStatus] = useState<SSEStatus>('connecting')
  const [latestEvent, setLatestEvent] = useState<BroadcastEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryDelayRef = useRef(2000)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus('connecting')
    const es = new EventSource(SSE_URL)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setStatus('connected')
      retryDelayRef.current = 2000  // Reset backoff on success
    })

    es.addEventListener('reroute', (event) => {
      try {
        const data: BroadcastEvent = JSON.parse(event.data)
        setLatestEvent(data)
        // Announce to screen readers via aria-live
        const liveEl = document.getElementById('sr-live-region')
        if (liveEl && data.messages?.en) {
          liveEl.textContent = data.messages.en
        }
      } catch {
        console.warn('SSE: failed to parse reroute event')
      }
    })

    es.addEventListener('keepalive', () => {
      // Silently acknowledge keepalive
    })

    es.onerror = () => {
      es.close()
      setStatus('reconnecting')
      retryTimerRef.current = setTimeout(() => {
        retryDelayRef.current = Math.min(retryDelayRef.current * 1.5, MAX_RETRY_DELAY)
        connect()
      }, retryDelayRef.current)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [connect])

  const dismiss = useCallback(() => {
    setLatestEvent(null)
  }, [])

  return { status, latestEvent, dismiss }
}
