import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, ClipboardList, BarChart3, History, Settings, Wallet } from 'lucide-react'

export function HomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto p-4">
      <div className="text-center pt-8">
        <h1 className="text-3xl font-bold tracking-tight">Scrap Scanner</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Gestioná tus tickets de scrapping
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 active:scale-[0.98]"
          onClick={() => navigate('/scan')}
        >
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Escanear con cámara</h2>
              <p className="text-sm text-muted-foreground">
                Capturá un ticket con la cámara y procesalo con OCR automático
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 active:scale-[0.98]"
          onClick={() => navigate('/editor', { state: { ocrResult: { items: [], rawText: '' }, capturedImageUrl: null } })}
        >
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <ClipboardList className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Boleta manual</h2>
              <p className="text-sm text-muted-foreground">
                Cargá los materiales, pesos y precios a mano
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <BarChart3 className="size-4 mr-1.5" />
          Dashboard
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
          <History className="size-4 mr-1.5" />
          Historial
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
          <Wallet className="size-4 mr-1.5" />
          Gastos
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="size-4 mr-1.5" />
          Precios
        </Button>
      </div>
    </div>
  )
}
