import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { HomeScreen } from '@/components/HomeScreen'
import { CameraView } from '@/components/CameraView'
import { TicketEditor } from '@/components/TicketEditor'
import { PriceManager } from '@/components/PriceManager'
import { LoginView } from '@/components/LoginView'
import { TicketHistory } from '@/components/TicketHistory'
import { TicketDetail } from '@/components/TicketDetail'
import { Dashboard } from '@/components/Dashboard'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

function AuthGate({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/scan" element={<CameraView />} />
        <Route path="/editor" element={<TicketEditor />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<TicketHistory />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/settings" element={<PriceManager />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthGate>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </AuthGate>
  )
}
