import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePanic } from '@/hooks/usePanic'

export function PanicButton() {
  const { trigger } = usePanic()
  const [confirming, setConfirming] = useState(false)

  // Cerrar el cartel con Escape
  useEffect(() => {
    if (!confirming) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirming(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Botón de pánico"
        title="Pánico: cierra sesión y borra los datos locales (Ctrl+Shift+L)"
        className="fixed bottom-3 right-3 z-50 flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/50 text-muted-foreground/40 backdrop-blur-sm transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        <ShieldAlert className="size-3.5" />
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar botón de pánico"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirming(false)}
        >
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4 text-destructive" />
                Botón de pánico
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Se cierra la sesión y se borran los datos locales de este equipo. ¿Confirmás?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={trigger}
                >
                  Activar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
