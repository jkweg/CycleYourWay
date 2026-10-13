import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import Sheet from './components/ui/Sheet'
import { Button } from './components/ui/controls'

const TIPS = [
  'Zaloguj się tym samym kontem — trasa jest prywatna, chyba że ją udostępnisz.',
  'Zezwól na lokalizację, bez niej nawigacja nie ruszy.',
  'Słaby GPS? Wyjdź na otwartą przestrzeń i odczekaj chwilę.',
]

function OpenOnPhoneModal({ isOpen, onClose, rideUrl, routeName }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const handleCopy = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(rideUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      setCopyError('Nie udało się skopiować — zaznacz link ręcznie.')
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      eyebrow="Na telefonie"
      title="Zeskanuj i jedź"
      description="Zeskanuj kod aparatem telefonu, żeby otworzyć trasę z nawigacją na żywo."
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-[24px] bg-ink p-5">
          <div className="rounded-[18px] bg-white p-3">
            {rideUrl && <QRCodeSVG value={rideUrl} size={184} level="M" marginSize={1} />}
          </div>
          {routeName && <p className="text-center font-serif text-lg text-vanilla">{routeName}</p>}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[#EFE0BC] bg-white py-1.5 pl-4 pr-1.5">
          <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">{rideUrl}</p>
          <Button size="sm" tone={copied ? 'orange' : 'ink'} onClick={handleCopy}>
            {copied ? <IconCheck size={16} stroke={2.6} /> : <IconCopy size={16} stroke={2.2} />}
            {copied ? 'Skopiowano' : 'Kopiuj'}
          </Button>
        </div>
        {copyError && <p className="text-center text-sm font-semibold text-[#9A2A12]">{copyError}</p>}

        <ol className="space-y-2">
          {TIPS.map((tip, index) => (
            <li key={tip} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-vanilla-deep text-xs font-bold text-ink">
                {index + 1}
              </span>
              {tip}
            </li>
          ))}
        </ol>
      </div>
    </Sheet>
  )
}

export default OpenOnPhoneModal
