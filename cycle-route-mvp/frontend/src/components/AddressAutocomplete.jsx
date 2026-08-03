import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../api'
import { pushAddressHistory, readAddressHistory } from '../lib/addressHistory'

function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = 'np. Rynek 1, Krosno',
  disabled = false,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [history, setHistory] = useState(() => readAddressHistory())
  const [isOpen, setIsOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [showHistory, setShowHistory] = useState(false)
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const query = value.trim()

    if (query.length < 2) {
      return undefined
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsFetching(true)
      setShowHistory(false)
      try {
        const response = await fetch(
          `${API_BASE}/api/geocode?address=${encodeURIComponent(query)}&limit=6&autocomplete=true`,
        )
        const data = await response.json()

        if (!response.ok) {
          setSuggestions([])
          setIsOpen(false)
          return
        }

        const nextSuggestions = data.results || []
        setSuggestions(nextSuggestions)
        setIsOpen(nextSuggestions.length > 0)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setIsFetching(false)
      }
    }, 320)

    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowHistory(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result) => {
    const nextHistory = pushAddressHistory(result)
    setHistory(nextHistory)
    onSelect(result)
    setSuggestions([])
    setIsOpen(false)
    setShowHistory(false)
    setActiveIndex(-1)
  }

  const dropdownItems = showHistory ? history : suggestions

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if ((isOpen || showHistory) && dropdownItems.length > 0) {
        handleSelect(dropdownItems[activeIndex >= 0 ? activeIndex : 0])
      } else if (onSubmit) {
        onSubmit()
      }
      return
    }

    if ((!isOpen && !showHistory) || dropdownItems.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % dropdownItems.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        current <= 0 ? dropdownItems.length - 1 : current - 1,
      )
    } else if (event.key === 'Escape') {
      setIsOpen(false)
      setShowHistory(false)
      setActiveIndex(-1)
    }
  }

  const handleChange = (nextValue) => {
    onChange(nextValue)
    if (nextValue.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const showRemoteDropdown =
    value.trim().length >= 2 && isOpen && suggestions.length > 0
  const showHistoryDropdown =
    showHistory && history.length > 0 && value.trim().length < 2
  const showDropdown = showRemoteDropdown || showHistoryDropdown

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          if (value.trim().length < 2 && history.length > 0) {
            setHistory(readAddressHistory())
            setShowHistory(true)
            setActiveIndex(-1)
          } else if (showRemoteDropdown) {
            setIsOpen(true)
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-[#C4A574] bg-white px-3.5 py-3 text-[15px] font-medium text-[#4a3226] outline-none transition placeholder:font-normal placeholder:text-stone-400 hover:border-[#E08A50] focus:border-[#FC6C26] focus:ring-2 focus:ring-[#FC6C26]/25 disabled:bg-[#F5E6C0]"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? `${id}-suggestions` : undefined}
      />

      {isFetching && value.trim().length >= 2 && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
          ...
        </span>
      )}

      {showDropdown && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#C4A574]/80 bg-[#FFF8E8]/98 py-1.5 shadow-[0_18px_45px_-18px_rgba(74,43,32,0.45)] backdrop-blur"
        >
          {showHistoryDropdown && (
            <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Ostatnie
            </li>
          )}
          {dropdownItems.map((suggestion, index) => (
            <li
              key={`${suggestion.name}-${suggestion.lat}-${suggestion.lon}`}
              role="option"
            >
              <button
                type="button"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(suggestion)}
                className={`block w-full px-3.5 py-2.5 text-left text-sm transition ${
                  index === activeIndex
                    ? 'bg-[#FFE8D6] font-medium text-[#E05518]'
                    : 'text-stone-700 hover:bg-[#F5E6C0]/80'
                }`}
              >
                {suggestion.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AddressAutocomplete
