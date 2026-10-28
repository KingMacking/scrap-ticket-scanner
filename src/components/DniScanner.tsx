import { useEffect, useState } from 'react'
import { Camera, Check, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCamera } from '@/hooks/useCamera'
import { useDniOcr, type DniData } from '@/hooks/useDniOcr'

const EMPTY: DniData = { dni: '', name: '', address: '' }

interface DniScannerProps {
  onClose: () => void
  onUse: (data: DniData) => void
}

export function DniScanner({ onClose, onUse }: DniScannerProps) {
  const {
    videoRef, status: camStatus, error: camError,
    start, stop, capture, rotated, toggleRotation,
  } = useCamera()
  const { status: ocrStatus, error: ocrError, recognize } = useDniOcr()
  const [draft, setDraft] = useState<DniData>(EMPTY)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  // Cerrar con Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleCapture = async () => {
    const image = capture()
    if (!image) return
    const data = await recognize(image)
    if (!data) return
    setDraft(data)
    setHasDraft(true)
  }

  const handleRetry = () => {
    setDraft(EMPTY)
    setHasDraft(false)
  }

  const isProcessing = ocrStatus === 'processing'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            {hasDraft ? 'Confirmá los datos' : 'Escanear dorso del DNI'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {!hasDraft ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              Enfocá el <strong>dorso</strong> del DNI, que se vean las 3 líneas de abajo.
              Si podés, evitá reflejos.
            </p>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              {camStatus === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              )}
              {camStatus === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-white/80">{camError ?? 'No se pudo abrir la cámara'}</p>
                </div>
              )}
            </div>

            {ocrError && <p className="mt-2 text-xs text-destructive">{ocrError}</p>}

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={handleCapture}
                disabled={camStatus !== 'active' || isProcessing}
              >
                {isProcessing
                  ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Leyendo...</>
                  : <><Camera className="size-4 mr-1.5" />Capturar</>}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={toggleRotation}
                title="Rotar imagen"
              >
                <RotateCcw className={`size-4 ${rotated ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              La foto se procesa con un servicio externo para leerla y no se guarda.
            </p>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">DNI</label>
                <Input
                  value={draft.dni}
                  onChange={(e) => setDraft((d) => ({ ...d, dni: e.target.value }))}
                  inputMode="numeric"
                  placeholder="Número"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Apellido y nombre</label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Tal cual figura en el DNI"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Domicilio</label>
                <textarea
                  value={draft.address}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                  rows={2}
                  placeholder="Tal cual figura en el dorso"
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Revisá los datos: podés corregirlos antes de usarlos.
            </p>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleRetry}
              >
                <RefreshCw className="size-4 mr-1.5" />
                Repetir foto
              </Button>
              <Button type="button" className="flex-1" onClick={() => onUse(draft)}>
                <Check className="size-4 mr-1.5" />
                Usar datos
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
