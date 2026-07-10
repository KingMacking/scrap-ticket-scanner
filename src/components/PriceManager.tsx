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
  defaultMaterialOrders: Record<string, number>
  onSave: (prices: PricesMap) => void
  onAddMaterial: (name: string) => void
  onRemoveMaterial: (name: string) => void
  onSetDefaultMaterialOrders: (orders: Record<string, number>) => void
  onBack: () => void
}

function nextOrder(orders: Record<string, number>): number {
  const vals = Object.values(orders)
  return vals.length > 0 ? Math.max(...vals) + 1 : 1
}

export function PriceManager({ prices, allMaterials, defaultMaterialOrders, onSave, onAddMaterial, onRemoveMaterial, onSetDefaultMaterialOrders, onBack }: PriceManagerProps) {
  const [purchaseDraft, setPurchaseDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allMaterials.map((mat) => [mat.name, prices[mat.name]?.purchase?.toString() ?? ''])
    )
  )
  const [saleDraft, setSaleDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allMaterials.map((mat) => [mat.name, prices[mat.name]?.sale?.toString() ?? ''])
    )
  )
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const handlePurchaseChange = (name: string, value: string) => {
    setPurchaseDraft((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaleChange = (name: string, value: string) => {
    setSaleDraft((prev) => ({ ...prev, [name]: value }))
  }

  const toggleDefault = (name: string) => {
    const next = { ...defaultMaterialOrders }
    if (name in next) {
      delete next[name]
    } else {
      next[name] = nextOrder(next)
    }
    onSetDefaultMaterialOrders(next)
  }

  const changeOrder = (name: string, value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1) return
    onSetDefaultMaterialOrders({ ...defaultMaterialOrders, [name]: num })
  }

  const handleSave = () => {
    const next: PricesMap = {}
    for (const mat of allMaterials) {
      const purchase = parseFloat(purchaseDraft[mat.name])
      const sale = parseFloat(saleDraft[mat.name])
      if (!isNaN(purchase) && purchase > 0) {
        next[mat.name] = {
          purchase,
          sale: !isNaN(sale) && sale > 0 ? sale : purchase,
        }
      }
    }
    if (newName.trim() && newPrice.trim()) {
      const val = parseFloat(newPrice)
      if (!isNaN(val) && val > 0) {
        onAddMaterial(newName.trim())
        next[newName.trim()] = { purchase: val, sale: val }
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
    setPurchaseDraft((prev) => ({ ...prev, [name]: price.toString() }))
    setSaleDraft((prev) => ({ ...prev, [name]: price.toString() }))
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
            Marcá con ✓ los materiales que aparecen en la boleta manual y asignales un orden.
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-center w-14">Predet.</TableHead>
                <TableHead className="text-center w-16">Orden</TableHead>
                <TableHead>Compra ($/kg)</TableHead>
                <TableHead>Venta ($/kg)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMaterials.map((mat) => {
                const isDefault = mat.name in defaultMaterialOrders
                return (
                  <TableRow key={mat.id}>
                    <TableCell className="font-medium">
                      {mat.name}
                      {mat.isCustom && <span className="ml-1.5 text-xs text-muted-foreground">(personalizado)</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={() => toggleDefault(mat.name)}
                        className="size-4 accent-primary cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="number"
                        min="1"
                        value={isDefault ? defaultMaterialOrders[mat.name] : ''}
                        disabled={!isDefault}
                        onChange={(e) => changeOrder(mat.name, e.target.value)}
                        className={`w-14 text-center text-sm border rounded-md px-1 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${!isDefault ? 'opacity-30' : ''}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="—"
                        className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={purchaseDraft[mat.name]}
                        onChange={(e) => handlePurchaseChange(mat.name, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="—"
                        className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={saleDraft[mat.name]}
                        onChange={(e) => handleSaleChange(mat.name, e.target.value)}
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
                )
              })}
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
