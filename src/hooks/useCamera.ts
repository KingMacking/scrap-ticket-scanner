import { useRef, useState, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rotated, setRotated] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setStatus('requesting')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('active')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
      setError(message)
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  const capture = useCallback((): string | null => {
    const video = videoRef.current
    if (!video) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    if (rotated) {
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI)
      ctx.drawImage(video, -canvas.width / 2, -canvas.height / 2)
    } else {
      ctx.drawImage(video, 0, 0)
    }
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [rotated])

  const toggleRotation = useCallback(() => setRotated((r) => !r), [])

  // Limpiar stream al desmontar
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  return { videoRef, status, error, start, stop, capture, rotated, toggleRotation }
}
