import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { PricesMap, MaterialInfo } from '@/hooks/usePrices'

interface PriceManagerProps {
  prices: PricesMap
  allMaterials: MaterialInfo[]
  onSave: (prices: PricesMap) => void
  onAddMaterial: (name: string) => void
  onRemoveMaterial: (name: string) => void
  onBack: () => void
}

export function PriceManager({ prices, allMaterials, onSave, onAddMaterial, onRemoveMaterial, onBack }: PriceManagerProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allMaterials.map((mat) => [mat.name, prices[mat.name]?.toString() ?? ''])
    )
  )
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const handleChange = (name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    const next: PricesMap = {}
    for (const mat of allMaterials) {
      const val = parseFloat(draft[mat.name])
      if (!isNaN(val) && val > 0) {
        next[mat.name] = val
      }
    }
    if (newName.trim() && newPrice.trim()) {
      const val = parseFloat(newPrice)
      if (!isNaN(val) && val > 0) {
        onAddMaterial(newName.trim())
        next[newName.trim()] = val
      }
    }
    onSave(next)
    toast.success('Precios guardados')
  }

  const handleAddNew = () => {
    const name = newName.trim()
    const price = parseFloat(newPrice)
    if (!name) return toast.error('Ingresá un nombre')
    if (isNaN(price) || price <= 0) return toast.error('Ingresá un precio válido')
    if (allMaterials.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      return toast.error('Ese material ya existe')
    }
    onAddMaterial(name)
    setDraft((prev) => ({ ...prev, [name]: price.toString() }))
    setNewName('')
    setNewPrice('')
    toast.success(`"${name}" agregado`)
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMaterials.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell className="font-medium">
                    {mat.name}
                    {mat.isCustom && <span className="ml-1.5 text-xs text-muted-foreground">(personalizado)</span>}
                  </TableCell>
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
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveMaterial(mat.name)
                        toast.success(`"${mat.name}" eliminado`)
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Eliminar ${mat.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agregar material */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Agregar material</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Mezcla"
              />
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground mb-1 block">$ / kg</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="160"
              />
            </div>
            <Button onClick={handleAddNew} size="icon">
              <Plus className="size-4" />
            </Button>
          </div>
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
