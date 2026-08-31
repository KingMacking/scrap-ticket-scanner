import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const navigate = useNavigate()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/editor', {
        state: { ocrResult: { items: [], rawText: '' }, capturedImageUrl: null },
      })}
    >
      <ArrowLeft className="size-3.5 mr-1.5" />
      Boleta manual
    </Button>
  )
}
