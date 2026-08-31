import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { BarChart3, History, Settings, LogOut, Home, Wallet } from 'lucide-react'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const isHome = location.pathname === '/'

  return (
    <main className="min-h-screen bg-background text-foreground py-6">
      {!isHome && (
        <div className="flex justify-end items-center flex-wrap w-full max-w-2xl mx-auto px-4 mb-2 gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="size-4 mr-1.5" />
            Inicio
          </Button>
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
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      )}
      <Outlet />
    </main>
  )
}
