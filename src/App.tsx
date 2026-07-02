import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { CameraView } from '@/components/CameraView'
import { TicketEditor } from '@/components/TicketEditor'
import { PriceManager } from '@/components/PriceManager'
import { usePrices } from '@/hooks/usePrices'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import type { OcrResult } from '@/types/ticket'

type AppView = 'camera' | 'ticket' | 'settings'

function App() {
  const [view, setView] = useState<AppView>('camera')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [prevView, setPrevView] = useState<AppView>('camera')
  const { prices, allMaterials, saveAll, addMaterial, removeMaterial } = usePrices()

  const handleOcrResult = (imageUrl: string, result: OcrResult) => {
    setCapturedImageUrl(imageUrl)
    setOcrResult(result)
    setView('ticket')
  }

  const handleManual = () => {
    setCapturedImageUrl(null)
    setOcrResult({ items: [], rawText: '' })
    setView('ticket')
  }

  const handleReset = () => {
    setCapturedImageUrl(null)
    setOcrResult(null)
    setView('camera')
  }

  const openSettings = () => {
    setPrevView(view)
    setView('settings')
  }

  const closeSettings = () => {
    setView(prevView)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-background text-foreground py-6">
        {view !== 'settings' && (
          <div className="flex justify-end w-full max-w-2xl mx-auto px-4 mb-2">
            <Button variant="ghost" size="sm" onClick={openSettings}>
              <Settings className="size-4 mr-1.5" />
              Precios
            </Button>
          </div>
        )}
        {view === 'camera' && (
          <CameraView onResult={handleOcrResult} onManual={handleManual} />
        )}
        {view === 'ticket' && ocrResult && (
          <TicketEditor
            ocrResult={ocrResult}
            capturedImageUrl={capturedImageUrl}
            prices={prices}
            allMaterials={allMaterials}
            onReset={handleReset}
          />
        )}
        {view === 'settings' && (
          <PriceManager
            prices={prices}
            allMaterials={allMaterials}
            onSave={saveAll}
            onAddMaterial={addMaterial}
            onRemoveMaterial={removeMaterial}
            onBack={closeSettings}
          />
        )}
      </main>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
