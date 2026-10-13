import { IconDownload, IconExternalLink } from '@tabler/icons-react'
import Sheet from './components/ui/Sheet'
import { Button } from './components/ui/controls'

function GoogleMapsExportNoticeModal({ isOpen, onClose, onConfirm, onDownloadGpx }) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      eyebrow="Google Maps"
      title="Trasa może się różnić"
      description="Link do Google Maps zawiera tylko kilka punktów, więc przebieg może odbiegać od trasy z planera — zwłaszcza na szutrach i w lesie."
      size="sm"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            tone="ink"
            className="w-full sm:flex-1"
            onClick={() => {
              onDownloadGpx()
              onClose()
            }}
          >
            <IconDownload size={18} stroke={2.2} className="text-burnt-orange" />
            Pobierz GPX
          </Button>
          <Button tone="outline" className="w-full sm:flex-1" onClick={handleConfirm}>
            <IconExternalLink size={18} stroke={2.2} />
            Otwórz mimo to
          </Button>
        </div>
      }
    >
      <div className="rounded-[22px] border border-[#EFE0BC] bg-white p-4 text-[15px] leading-relaxed text-ink-muted">
        Dokładniej: pobierz plik GPX i zaimportuj go w Google Maps (Moje mapy → Utwórz mapę → Importuj) albo w aplikacji
        rowerowej.
      </div>
    </Sheet>
  )
}

export default GoogleMapsExportNoticeModal
