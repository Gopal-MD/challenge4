import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../types'

const API_BASE = '/api'

const SUGGESTION_KEYS = ['restroom', 'food', 'medical', 'accessibility', 'family', 'exit'] as const

function generateId() { return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

async function sendIncidentReport(message: string, language: string): Promise<string> {
  const res = await fetch(`${API_BASE}/incident`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident_type: 'raw_report',
      raw_report: message,
      reporter_id: `fan_${Date.now()}`,
      location: 'Fan Request',
      language_preferred_response: language,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  // Return a friendly user-facing message from the response scripts
  const scripts = data.response_scripts || {}
  const broadcastKey = `public_broadcast_${language}`
  return scripts[broadcastKey] || scripts.public_broadcast_en ||
    `I've logged your report (${data.triage.category} — priority ${data.triage.priority_queue_position}). Staff have been notified.`
}

export default function ChatPage() {
  const { t, i18n } = useTranslation()
  const chatId = useId()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: t('chat.greeting'),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || thinking) return
    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text.trim(), timestamp: new Date() }
    const loadingMsg: ChatMessage = { id: generateId(), role: 'assistant', content: '', timestamp: new Date(), loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setThinking(true)

    try {
      const response = await sendIncidentReport(text.trim(), i18n.language)
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, content: response, loading: false } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, content: t('chat.error'), loading: false }
        : m
      ))
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <section
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)' }}
      aria-labelledby="chat-title"
    >
      <h1 className="card-title" id="chat-title">
        <span aria-hidden="true">💬</span> {t('chat.title')}
      </h1>
      <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>{t('chat.subtitle')}</p>

      {/* Quick suggestion chips */}
      <div className="chat-suggestions" role="list" aria-label="Quick suggestions">
        {SUGGESTION_KEYS.map(key => (
          <button
            key={key}
            className="chat-suggestion"
            onClick={() => sendMessage(t(`chat.suggestions.${key}`))}
            disabled={thinking}
            role="listitem"
            aria-label={`Quick request: ${t(`chat.suggestions.${key}`)}`}
          >
            {t(`chat.suggestions.${key}`)}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
        id={`${chatId}-messages`}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
            role={msg.role === 'assistant' ? 'status' : undefined}
          >
            {msg.loading ? (
              <div className="loading-dots" aria-label={t('chat.thinking')}>
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            ) : (
              <>
                {msg.content}
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4 }}>
                  <time dateTime={msg.timestamp.toISOString()}>
                    {msg.timestamp.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input area */}
      <div className="chat-input-area" role="form" aria-label="Send message">
        <input
          ref={inputRef}
          id={`${chatId}-input`}
          type="text"
          className="form-control"
          placeholder={t('chat.placeholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
          aria-label={t('chat.placeholder')}
          aria-controls={`${chatId}-messages`}
          autoComplete="off"
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage(input)}
          disabled={thinking || !input.trim()}
          aria-label={t('chat.send')}
          id="chat-send-btn"
        >
          {thinking ? '⏳' : '➤'}
        </button>
      </div>
    </section>
  )
}
