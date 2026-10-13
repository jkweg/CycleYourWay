import { useState } from 'react'
import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { ROUTE_NAME_MAX, TAG_MAX, TAGS_MAX, normalizeTags } from './lib/dataLimits'
import Sheet from './components/ui/Sheet'
import { Button, Field, Spinner } from './components/ui/controls'

function SaveRouteModal({ isOpen, defaultName, isSaving, canOverwrite = false, onClose, onSave }) {
  const [name, setName] = useState(defaultName)
  const [tagsText, setTagsText] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)

  const submit = (event, mode = 'insert') => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ name: trimmed, tags: normalizeTags(tagsText), isFavorite }, mode)
  }

  const disabled = isSaving || !name.trim()

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      eyebrow="Biblioteka tras"
      title="Zapisz trasę"
      description={
        canOverwrite
          ? 'Nadpisz wczytaną trasę albo zapisz ją jako nową.'
          : 'Nadaj nazwę, żeby łatwo ją potem odnaleźć.'
      }
      size="sm"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" form="save-route-form" className="flex-1" disabled={disabled}>
            {isSaving && <Spinner />}
            {isSaving ? 'Zapisywanie…' : canOverwrite ? 'Nadpisz' : 'Zapisz'}
          </Button>
          {canOverwrite && (
            <Button tone="outline" className="flex-1" disabled={disabled} onClick={(event) => submit(event, 'insert')}>
              Zapisz jako nową
            </Button>
          )}
        </div>
      }
    >
      <form id="save-route-form" className="space-y-4" onSubmit={(event) => submit(event, canOverwrite ? 'update' : 'insert')}>
        <Field
          id="route-name"
          label="Nazwa trasy"
          required
          maxLength={ROUTE_NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          id="route-tags"
          label="Tagi"
          maxLength={TAGS_MAX * (TAG_MAX + 2)}
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          placeholder="np. gravel, trening, rodzina"
          hint="Oddziel tagi przecinkami."
        />
        <button
          type="button"
          aria-pressed={isFavorite}
          onClick={() => setIsFavorite((value) => !value)}
          className={`press flex h-12 w-full items-center gap-3 rounded-2xl border px-4 text-left text-[15px] font-semibold transition-colors duration-200 ${
            isFavorite ? 'border-burnt-orange/50 bg-[#FFE9D8] text-ink' : 'border-[#EFE0BC] bg-white text-ink'
          }`}
        >
          {isFavorite ? (
            <IconStarFilled size={20} className="text-burnt-orange" />
          ) : (
            <IconStar size={20} stroke={2} className="text-[#C9B58C]" />
          )}
          {isFavorite ? 'W ulubionych' : 'Dodaj do ulubionych'}
        </button>
      </form>
    </Sheet>
  )
}

export default SaveRouteModal
