import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function OpenOnPhoneModal({ isOpen, onClose, rideUrl, routeName }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rideUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
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

          <p className="text-center text-xs leading-5 text-stone-500">
            Trasa jest prywatna — na telefonie zaloguj się tym samym kontem, aby ją otworzyć.
          </p>
        </div>
      </div>
    </div>
  )
}

export default OpenOnPhoneModal
