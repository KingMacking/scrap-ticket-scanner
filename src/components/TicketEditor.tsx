import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm, useWatch, useFieldArray } from 'react-hook-form'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Printer, RotateCcw, CheckCircle2, ChevronDown, ChevronUp,
  Wifi, WifiOff, Loader2, Trash2, Plus, ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { TicketPreview } from '@/components/TicketPreview'
import { usePrices } from '@/hooks/usePrices'
import { useTicketDb } from '@/hooks/useTicketDb'
import { useQzTray } from '@/hooks/useQzTray'
import type { OcrResult, TicketItem } from '@/types/ticket'
import type { MaterialInfo } from '@/hooks/usePrices'
import type { PrintItem } from '@/lib/buildEscPos'

type RowInput = {
  materialId: string
  weight: string
  price: string
}

type FormInput = {
  items: RowInput[]
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export function TicketEditor() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { ocrResult?: OcrResult; capturedImageUrl?: string } | null
  const ocrResult = state?.ocrResult ?? { items: [], rawText: '' }
  const capturedImageUrl = state?.capturedImageUrl ?? null
  const isManual = ocrResult.items.length === 0 && !capturedImageUrl

  const { prices, allMaterials, defaultMaterialOrders } = usePrices()
  const { createTicket, updateTicket } = useTicketDb()
  const { status: qzStatus, print: qzPrint, connect: qzConnect } = useQzTray()

  const [showRawText, setShowRawText] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [savedTicketId, setSavedTicketId] = useState<string | null>(null)
  const [debo, setDebo] = useState('')

  const defaultMaterialIds = useMemo(
    () => Object.entries(defaultMaterialOrders)
      .sort(([, a], [, b]) => a - b)
      .map(([name]) => allMaterials.find((m) => m.name === name)?.id)
      .filter((id): id is string => id !== undefined),
    [defaultMaterialOrders, allMaterials]
  )

  const detectedMaterials = isManual && defaultMaterialIds
    ? defaultMaterialIds
        .map((id) => allMaterials.find((mat) => mat.id === id))
        .filter((mat): mat is MaterialInfo => mat !== undefined)
    : allMaterials.filter((mat) =>
        ocrResult.items.some((i) => i.materialName === mat.name && i.detectedWeight !== null)
      )

  const buildDefaultValues = () => ({
    items: detectedMaterials.map((mat) => {
      const detected = ocrResult.items.find((i) => i.materialName === mat.name && i.detectedWeight !== null)
      return {
        materialId: mat.id,
        weight: detected?.detectedWeight?.toString() ?? '',
        price: prices[mat.name]?.purchase?.toString() ?? '',
      }
    }),
  })

  const { register, handleSubmit, control, reset } = useForm<FormInput>({
    defaultValues: buildDefaultValues(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' })

  const subtotals = watchedItems.map((item) => {
    const w = parseFloat(item?.weight ?? '')
    const p = parseFloat(item?.price ?? '')
    return !isNaN(w) && !isNaN(p) && w > 0 && p > 0 ? w * p : null
  })

  const total = subtotals.reduce<number>((acc, s) => acc + (s ?? 0), 0)

  const previewItems = watchedItems.map((item) => {
    const mat = allMaterials.find((m) => m.id === item?.materialId)
    const w = parseFloat(item?.weight ?? '')
    const p = parseFloat(item?.price ?? '')
    return {
      materialName: mat?.name ?? '',
      weight: isNaN(w) ? 0 : w,
      price: isNaN(p) ? 0 : p,
      subtotal: isNaN(w) || isNaN(p) ? 0 : w * p,
    }
  })

  const usedIds = new Set(watchedItems.map((i) => i?.materialId))
  const availableToAdd = allMaterials.filter((m) => !usedIds.has(m.id))

  const handleAddMaterial = (materialId: string) => {
    const mat = allMaterials.find((m) => m.id === materialId)
    if (!mat) return
    append({
      materialId: mat.id,
      weight: '',
      price: prices[mat.name]?.purchase?.toString() ?? '',
    })
  }

  const buildTicketItems = (data: FormInput): TicketItem[] =>
    data.items
      .map((row): TicketItem | null => {
        const w = parseFloat(row.weight)
        const p = parseFloat(row.price)
        const mat = allMaterials.find((m) => m.id === row.materialId)
        if (!mat || isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return null
        const salePrice = prices[mat.name]?.sale
        const clampedPrice = salePrice !== undefined && p > salePrice ? salePrice : p
        return {
          id: '',
          materialName: mat.name,
          detectedWeight: null,
          correctedWeight: w,
          price: clampedPrice,
        }
      })
      .filter((i): i is TicketItem => i !== null)

  const onSubmit = async (data: FormInput) => {
    setIsPrinting(true)
    try {
      const items = buildTicketItems(data)
      if (items.length === 0) {
        toast.error('Agregá al menos un material válido')
        setIsPrinting(false)
        return
      }

      const printItems: PrintItem[] = items.map((i) => ({
        materialName: i.materialName,
        weight: i.correctedWeight ?? 0,
        price: i.price ?? 0,
        subtotal: (i.correctedWeight ?? 0) * (i.price ?? 0),
      }))

      let ticketId = savedTicketId
      if (!ticketId) {
        ticketId = await createTicket({
          items: items.map((i) => ({
            materialName: i.materialName,
            weight: i.correctedWeight ?? 0,
            price: i.price ?? 0,
          })),
          total,
        })
        if (ticketId) setSavedTicketId(ticketId)
      }

      await qzPrint({ items: printItems, total, date: new Date(), debo })

      if (ticketId) {
        await updateTicket(ticketId, { status: 'printed' })
      }

      toast.success('Ticket guardado e impreso')
      setDebo('')

      if (isManual) {
        reset()
        setSavedTicketId(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir'
      toast.error(msg)
      console.error('[Print]', err)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isManual
            ? <ClipboardList className="size-5 text-blue-500" />
            : <CheckCircle2 className="size-5 text-green-600" />
          }
          <h1 className="text-xl font-semibold">
            {isManual ? 'Boleta manual' : 'Ticket digital'}
          </h1>
          {!isManual && <Badge variant="secondary">Revisión</Badge>}
          <Badge variant="outline">
            {fields.length} material{fields.length !== 1 ? 'es' : ''}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(isManual ? '/' : '/scan')}>
          <RotateCcw className="size-3.5 mr-1.5" />
          {isManual ? 'Volver' : 'Nuevo escaneo'}
        </Button>
      </div>

      {/* Preview del ticket */}
      <TicketPreview
        items={previewItems}
        total={total}
        visible={showPreview}
        onToggle={() => setShowPreview((v) => !v)}
      />

      {capturedImageUrl && (
        <Card className="overflow-hidden print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Imagen capturada</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <img src={capturedImageUrl} alt="Ticket escaneado" className="w-full max-h-52 object-contain" />
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-0">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <ClipboardList className="size-8 opacity-30" />
                <p className="text-sm">Agregá materiales con el selector de abajo</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Precio ($/kg)</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => {
                    const mat = allMaterials.find((m) => m.id === field.materialId)
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{mat?.name ?? field.materialId}</TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${idx}.weight`)}
                            type="number"
                            step="0.01"
                            placeholder="—"
                            className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${idx}.price`)}
                            type="number"
                            step="0.01"
                            placeholder="—"
                            max={mat ? prices[mat.name]?.sale ?? '' : ''}
                            className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {subtotals[idx] !== null ? `$ ${fmt(subtotals[idx]!)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Eliminar material"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {availableToAdd.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Plus className="size-4 text-muted-foreground shrink-0" />
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => { if (e.target.value) handleAddMaterial(e.target.value) }}
            >
              <option value="" disabled>Agregar material...</option>
              {[...availableToAdd].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 px-1 border-t pt-4">
          <span className="text-lg font-semibold text-muted-foreground">Total</span>
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            $ {fmt(total)}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-4 px-1">
          <label className="text-lg font-semibold text-muted-foreground shrink-0">Debo</label>
          <Input
            value={debo}
            onChange={(e) => setDebo(e.target.value)}
            placeholder="Monto (opcional)"
            className="flex-1"
          />
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center gap-2">
            {savedTicketId && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                Guardado
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs">
              {qzStatus === 'connected' && (
                <><Wifi className="size-3.5 text-green-600" /><span className="text-green-600">Impresora conectada</span></>
              )}
              {qzStatus === 'connecting' && (
                <><Loader2 className="size-3.5 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Conectando...</span></>
              )}
              {(qzStatus === 'disconnected' || qzStatus === 'error') && (
                <button
                  type="button"
                  onClick={qzConnect}
                  className="flex items-center gap-1.5 text-destructive hover:underline"
                >
                  <WifiOff className="size-3.5" />
                  <span>QZ Tray sin conexión — reintentar</span>
                </button>
              )}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isPrinting}>
            {isPrinting
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Imprimiendo...</>
              : <><Printer className="size-4 mr-2" />Imprimir y guardar</>
            }
          </Button>
        </div>
      </form>

      {import.meta.env.DEV && (
        <div className="print:hidden">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowRawText((v) => !v)}
          >
            {showRawText ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Texto crudo OCR ({ocrResult.rawText.length} chars)
          </button>
          {showRawText && (
            <pre className="mt-2 p-3 rounded-md bg-muted text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-64 overflow-auto">
              {ocrResult.rawText || '(vacío — OCR no detectó texto)'}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
