function GoogleMapsExportNoticeModal({ isOpen, onClose, onConfirm, onDownloadGpx }) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-maps-notice-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="google-maps-notice-title" className="text-xl font-semibold text-[#2e5f43]">
              Trasa w Google Maps może być niedokładna
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Link do Google Maps zawiera tylko kilka punktów pośrednich, więc przebieg może
              różnić się od trasy w planerze — zwłaszcza na trasach rowerowych i leśnych.
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Dla dokładniejszej nawigacji pobierz plik GPX i zaimportuj go w aplikacji Google
              Maps (Moje mapy → Utwórz mapę → Importuj).
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleConfirm}
            className="soft-button flex-1 rounded-xl border border-[#dfd4c2] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-[#f3ede2]"
          >
            Rozumiem
          </button>
          <button
            type="button"
            onClick={() => {
              onDownloadGpx()
              onClose()
            }}
            className="soft-button flex-1 rounded-xl bg-[#7a6248] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6c563f]"
          >
            Pobierz GPX
          </button>
        </div>
      </div>
    </div>
  )
}

export default GoogleMapsExportNoticeModal
