import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function OpenOnPhoneModal({ isOpen, onClose, rideUrl, routeName }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  if (!isOpen) return null

  const handleCopy = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(rideUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      setCopyError('Nie udało się skopiować — zaznacz link powyżej ręcznie.')
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-on-phone-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="open-on-phone-title" className="text-xl font-semibold text-[#2e5f43]">
              Otwórz trasę na telefonie
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Zeskanuj kod aparatem telefonu, aby uruchomić tryb jazdy z nawigacją na żywo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-[#e8dfcf] bg-white p-4 shadow-sm">
            <QRCodeSVG value={rideUrl} size={196} level="M" marginSize={1} />
          </div>

          {routeName && (
            <p className="text-center text-sm font-medium text-[#2e5f43]">{routeName}</p>
          )}

          <div className="w-full rounded-lg bg-[#f4efe6] px-3 py-2">
            <p className="break-all text-center text-xs text-stone-600">{rideUrl}</p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="soft-button w-full rounded-xl bg-[#3f7b57] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#356b4b]"
          >
            {copied ? 'Skopiowano link' : 'Kopiuj link'}
          </button>

          {copyError && (
            <p className="text-center text-xs font-medium text-rose-700">{copyError}</p>
          )}

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-left text-xs leading-5 text-amber-900">
            <p className="font-semibold">Na telefonie</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Zaloguj się tym samym kontem (trasa jest prywatna, chyba że ją udostępnisz).</li>
              <li>Zezwól na lokalizację GPS — bez niej nawigacja nie ruszy.</li>
              <li>Jeśli GPS jest niedokładny, wyjdź na otwartą przestrzeń i odczekaj chwilę.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OpenOnPhoneModal
