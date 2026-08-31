import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from '@/hooks/useCamera'
import { useGeminiOcr } from '@/hooks/useGeminiOcr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, ScanLine, RefreshCw, Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'

export function CameraView() {
  const navigate = useNavigate()
  const { videoRef, status: camStatus, error: camError, start, stop, capture, rotated, toggleRotation } = useCamera()
  const { status: ocrStatus, result, progress, recognize, reset } = useGeminiOcr()
  const capturedUrlRef = useRef<string>('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  useEffect(() => {
    if (ocrStatus === 'done' && result) {
      navigate('/editor', {
        state: {
          ocrResult: result,
          capturedImageUrl: capturedUrlRef.current,
        },
      })
    }
  }, [ocrStatus, result, navigate])

  useEffect(() => {
    if (camError) toast.error(`Cámara: ${camError}`)
  }, [camError])

  useEffect(() => {
    if (ocrStatus === 'error') toast.error('No se pudo procesar la imagen')
  }, [ocrStatus])

  const handleCapture = async () => {
    const imageUrl = capture()
    if (!imageUrl) return toast.error('No hay imagen de la cámara')
    capturedUrlRef.current = imageUrl
    if (import.meta.env.DEV) setPreviewUrl(imageUrl)
    recognize(imageUrl)
  }

  const isProcessing = ocrStatus === 'processing'

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 self-start">
        <Camera className="size-5" />
        <h1 className="text-xl font-semibold">Escanear ticket</h1>
        {camStatus === 'active' && <Badge variant="secondary">Cámara activa</Badge>}
        {camStatus === 'requesting' && <Badge variant="outline">Conectando...</Badge>}
        {camStatus === 'error' && <Badge variant="destructive">Sin cámara</Badge>}
        <div className="ml-auto"><BackButton /></div>
      </div>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0 relative">
          <video
            ref={videoRef}
            className={`w-full rounded-lg bg-muted aspect-video object-cover transition-transform duration-300 ${rotated ? 'rotate-180' : ''}`}
            muted
            playsInline
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-3 rounded-lg">
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm font-medium">Procesando OCR... {progress}%</p>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {import.meta.env.DEV && previewUrl && (
        <div className="w-full">
          <p className="text-xs text-muted-foreground mb-1">Imagen capturada:</p>
          <img src={previewUrl} alt="Captura" className="w-full rounded-md border border-border" />
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <Button
          size="lg"
          onClick={handleCapture}
          disabled={camStatus !== 'active' || isProcessing}
        >
          <ScanLine className="size-4 mr-2" />
          Capturar y escanear
        </Button>
        {ocrStatus !== 'idle' && (
          <Button variant="outline" size="lg" onClick={reset}>
            <RefreshCw className="size-4 mr-2" />
            Repetir
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={toggleRotation} title="Rotar 180°">
          <RotateCw className={`size-4 transition-transform ${rotated ? 'rotate-180 text-primary' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
