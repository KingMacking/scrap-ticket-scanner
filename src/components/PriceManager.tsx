import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { MATERIALS } from '@/data/materials'
import type { PricesMap } from '@/hooks/usePrices'

interface PriceManagerProps {
  prices: PricesMap
  onSave: (prices: PricesMap) => void
  onBack: () => void
}

export function PriceManager({ prices, onSave, onBack }: PriceManagerProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      MATERIALS.map((mat) => [mat.name, prices[mat.name]?.toString() ?? ''])
    )
  )

  const handleChange = (name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    const next: PricesMap = {}
    for (const mat of MATERIALS) {
      const val = parseFloat(draft[mat.name])
      if (!isNaN(val) && val > 0) {
        next[mat.name] = val
      }
    }
    onSave(next)
    toast.success('Precios guardados')
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Precios por material</h1>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Estos precios se usarán como valor predeterminado al escanear un ticket.
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Precio ($ / kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATERIALS.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell className="font-medium">{mat.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      className="w-32 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={draft[mat.name]}
                      onChange={(e) => handleChange(mat.name, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="size-4 mr-2" />
          Guardar precios
        </Button>
      </div>
    </div>
  )
}
