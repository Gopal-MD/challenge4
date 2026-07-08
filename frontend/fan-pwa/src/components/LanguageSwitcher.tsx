import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'

interface Language { code: string; label: string; flag: string }
interface Props { languages: Language[] }

export default function LanguageSwitcher({ languages }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const current = languages.find(l => l.code === i18n.language) ?? languages[0]

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  function selectLanguage(code: string) {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="lang-switcher" ref={containerRef}>
      <button
        className="lang-btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('language')}: ${current.label}`}
        id="lang-switcher-btn"
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="lang-dropdown"
          role="listbox"
          aria-label={t('language')}
          aria-activedescendant={`lang-option-${i18n.language}`}
          id="lang-dropdown"
        >
          {languages.map(lang => (
            <button
              key={lang.code}
              className="lang-option"
              role="option"
              aria-selected={lang.code === i18n.language}
              id={`lang-option-${lang.code}`}
              onClick={() => selectLanguage(lang.code)}
            >
              <span aria-hidden="true">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === i18n.language && <span aria-hidden="true" style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
