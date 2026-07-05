import { useState, useMemo } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { CameraView } from '@/components/CameraView'
import { TicketEditor } from '@/components/TicketEditor'
import { PriceManager } from '@/components/PriceManager'
import { LoginView } from '@/components/LoginView'
import { TicketHistory } from '@/components/TicketHistory'
import { TicketDetail } from '@/components/TicketDetail'
import { Dashboard } from '@/components/Dashboard'
import { useAuth } from '@/hooks/useAuth'
import { usePrices } from '@/hooks/usePrices'
import { useTicketDb } from '@/hooks/useTicketDb'
import { Button } from '@/components/ui/button'
import { Settings, History, BarChart3, LogOut, Loader2 } from 'lucide-react'
import type { OcrResult, TicketItem } from '@/types/ticket'

type AppView = 'camera' | 'ticket' | 'settings' | 'history' | 'ticket-detail' | 'dashboard'

function AppContent() {
  const [view, setView] = useState<AppView>('camera')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [prevView, setPrevView] = useState<AppView>('camera')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const { prices, allMaterials, saveAll, addMaterial, removeMaterial, defaultMaterialOrders, setDefaultMaterialOrders } = usePrices()
  const defaultMaterialIds = useMemo(
    () => Object.entries(defaultMaterialOrders)
      .sort(([, a], [, b]) => a - b)
      .map(([name]) => allMaterials.find((m) => m.name === name)?.id)
      .filter((id): id is string => id !== undefined),
    [defaultMaterialOrders, allMaterials]
  )
  const { createTicket, updateTicket } = useTicketDb()
  const { signOut } = useAuth()

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

  const handleSaveTicket = async (items: TicketItem[], total: number): Promise<string | null> => {
    return createTicket({
      items: items.map((i) => ({
        materialName: i.materialName,
        weight: i.correctedWeight ?? 0,
        price: i.price ?? 0,
      })),
      total,
      capturedImageUrl,
      ocrRawText: ocrResult?.rawText ?? null,
    })
  }

  const handleMarkPrinted = async (ticketId: string) => {
    await updateTicket(ticketId, { status: 'printed' })
  }

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setView('ticket-detail')
  }

  const openSettings = () => {
    setPrevView(view)
    setView('settings')
  }

  const closeSettings = () => {
    setView(prevView)
  }

  const navBarVisible = !['settings', 'history', 'ticket-detail', 'dashboard'].includes(view)

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-background text-foreground py-6">
        <div className="flex justify-end w-full max-w-2xl mx-auto px-4 mb-2 gap-1">
          {navBarVisible && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setView('dashboard')}>
                <BarChart3 className="size-4 mr-1.5" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setView('history')}>
                <History className="size-4 mr-1.5" />
                Historial
              </Button>
              <Button variant="ghost" size="sm" onClick={openSettings}>
                <Settings className="size-4 mr-1.5" />
                Precios
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" />
              </Button>
            </>
          )}
        </div>
        {view === 'camera' && (
          <CameraView onResult={handleOcrResult} onManual={handleManual} />
        )}
        {view === 'ticket' && ocrResult && (
          <TicketEditor
            ocrResult={ocrResult}
            capturedImageUrl={capturedImageUrl}
            prices={prices}
            allMaterials={allMaterials}
            defaultMaterialIds={defaultMaterialIds}
            onReset={handleReset}
            onSave={handleSaveTicket}
            onMarkPrinted={handleMarkPrinted}
          />
        )}
        {view === 'settings' && (
          <PriceManager
            prices={prices}
            allMaterials={allMaterials}
            defaultMaterialOrders={defaultMaterialOrders}
            onSave={saveAll}
            onAddMaterial={addMaterial}
            onRemoveMaterial={removeMaterial}
            onSetDefaultMaterialOrders={setDefaultMaterialOrders}
            onBack={closeSettings}
          />
        )}
        {view === 'history' && (
          <TicketHistory onBack={() => setView('camera')} onViewTicket={handleViewTicket} />
        )}
        {view === 'ticket-detail' && selectedTicketId && (
          <TicketDetail ticketId={selectedTicketId} onBack={() => setView('history')} />
        )}
        {view === 'dashboard' && (
          <Dashboard onBack={() => setView('camera')} />
        )}
      </main>
      <Toaster />
    </ThemeProvider>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </ThemeProvider>
    )
  }

  if (!user) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoginView />
      </ThemeProvider>
    )
  }

  return <AppContent />
}

export default App
