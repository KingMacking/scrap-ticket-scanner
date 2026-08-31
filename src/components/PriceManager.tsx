import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePrices } from '@/hooks/usePrices'
import { useQzTray } from '@/hooks/useQzTray'
import { buildPriceListEscPos } from '@/lib/buildEscPos'
import { Save, Trash2, Plus, Printer, X, Loader2, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

function nextOrder(orders: Record<string, number>): number {
  const vals = Object.values(orders)
  return vals.length > 0 ? Math.max(...vals) + 1 : 1
}

export function PriceManager() {
  const { prices, allMaterials, defaultMaterialOrders, saveAll, addMaterial, removeMaterial, setDefaultMaterialOrders } = usePrices()
  const { status: qzStatus, printRaw, connect: qzConnect } = useQzTray()

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

  // Lista de precios imprimible
  const [showPrintPanel, setShowPrintPanel] = useState(false)
  const [printSel, setPrintSel] = useState<Record<string, boolean>>({})
  const [printDraft, setPrintDraft] = useState<Record<string, string>>({})
  const [isPrinting, setIsPrinting] = useState(false)

  const openPrintPanel = () => {
    setPrintSel(Object.fromEntries(allMaterials.map((m) => [m.name, false])))
    setPrintDraft(
      Object.fromEntries(
        allMaterials.map((m) => [m.name, (prices[m.name]?.purchase ?? '').toString()])
      )
    )
    setShowPrintPanel(true)
  }

  const togglePrintSel = (name: string) => {
    setPrintSel((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handlePrintPriceChange = (name: string, value: string) => {
    setPrintDraft((prev) => ({ ...prev, [name]: value }))
  }

  const doPrintPriceList = async () => {
    const items = allMaterials
      .filter((m) => printSel[m.name])
      .map((m) => ({ name: m.name, price: parseFloat(printDraft[m.name]) }))
      .filter((it) => !isNaN(it.price) && it.price > 0)

    if (items.length === 0) {
      toast.error('Seleccioná al menos un material con precio válido')
      return
    }

    setIsPrinting(true)
    try {
      const lines = buildPriceListEscPos({ items, date: new Date() })
      await printRaw(lines)
      toast.success('Lista de precios impresa')
      setShowPrintPanel(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir'
      toast.error(msg)
      console.error('[Print price list]', err)
    } finally {
      setIsPrinting(false)
    }
  }

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
    setDefaultMaterialOrders(next)
  }

  const changeOrder = (name: string, value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1) return
    setDefaultMaterialOrders({ ...defaultMaterialOrders, [name]: num })
  }

  const handleSave = () => {
    const next: Record<string, { purchase: number; sale: number }> = {}
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
        addMaterial(newName.trim())
        next[newName.trim()] = { purchase: val, sale: val }
      }
    }
    saveAll(next)
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
    addMaterial(name)
    setPurchaseDraft((prev) => ({ ...prev, [name]: price.toString() }))
    setSaleDraft((prev) => ({ ...prev, [name]: price.toString() }))
    setNewName('')
    setNewPrice('')
    toast.success(`"${name}" agregado`)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Precios por material</h1>
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
                          removeMaterial(mat.name)
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={openPrintPanel} size="lg">
          <Printer className="size-4 mr-2" />
          Imprimir
        </Button>
        <Button onClick={handleSave} size="lg">
          <Save className="size-4 mr-2" />
          Guardar precios
        </Button>
      </div>

      {/* Modal: lista de precios imprimible */}
      {showPrintPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[85vh] flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Imprimir lista de precios</CardTitle>
                <p className="text-xs mt-1 flex items-center gap-1.5">
                  {qzStatus === 'connected' && <><Wifi className="size-3 text-green-600" /><span className="text-green-600">Impresora conectada</span></>}
                  {qzStatus === 'connecting' && <><Loader2 className="size-3 animate-spin" />Conectando...</>}
                  {(qzStatus === 'disconnected' || qzStatus === 'error') && (
                    <button type="button" onClick={qzConnect} className="text-destructive hover:underline">
                      <WifiOff className="size-3 inline mr-1" />
                      QZ Tray sin conexión — reintentar
                    </button>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintPanel(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </CardHeader>
            <div className="px-4 py-2 flex items-center justify-between border-y">
              <span className="text-xs font-medium text-muted-foreground">
                Marcá los precios a imprimir
              </span>
              <span className="text-xs text-muted-foreground">Precios ($/kg)</span>
            </div>
            <CardContent className="p-0 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right w-24">Compra ($/kg)</TableHead>
                    <TableHead className="text-right w-24">Venta ($/kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMaterials.map((mat) => (
                    <TableRow key={mat.id}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={!!printSel[mat.name]}
                          onChange={() => togglePrintSel(mat.name)}
                          className="size-4 accent-primary cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{mat.name}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={printDraft[mat.name] ?? ''}
                          onChange={(e) => handlePrintPriceChange(mat.name, e.target.value)}
                          className="w-24 ml-auto [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {prices[mat.name]?.sale != null ? prices[mat.name]!.sale.toLocaleString('es-AR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-3 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPrintPanel(false)} disabled={isPrinting}>
                Cancelar
              </Button>
              <Button onClick={doPrintPriceList} disabled={isPrinting}>
                {isPrinting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
                Imprimir
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
