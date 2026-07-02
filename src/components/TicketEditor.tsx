import { useState } from 'react'
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
import type { OcrResult } from '@/types/ticket'
import type { PricesMap, MaterialInfo } from '@/hooks/usePrices'
import { useQzTray } from '@/hooks/useQzTray'
import type { PrintItem } from '@/lib/buildEscPos'

type RowInput = {
  materialId: string
  weight: string
  price: string
}

type FormInput = {
  items: RowInput[]
}

interface TicketEditorProps {
  ocrResult: OcrResult
  capturedImageUrl: string | null
  prices: PricesMap
  allMaterials: MaterialInfo[]
  onReset: () => void
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export function TicketEditor({ ocrResult, capturedImageUrl, prices, allMaterials, onReset }: TicketEditorProps) {
  const [showRawText, setShowRawText] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const { status: qzStatus, print: qzPrint, connect: qzConnect } = useQzTray()

  // Materiales detectados por el OCR como filas iniciales
  const detectedMaterials = allMaterials.filter((mat) =>
    ocrResult.items.some((i) => i.materialName === mat.name && i.detectedWeight !== null)
  )

  const { register, handleSubmit, control } = useForm<FormInput>({
    defaultValues: {
        items: detectedMaterials.map((mat) => {
        const detected = ocrResult.items.find((i) => i.materialName === mat.name)
        return {
          materialId: mat.id,
          weight: detected?.detectedWeight?.toString() ?? '',
          price: prices[mat.name]?.toString() ?? '',
        }
      }),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' })

  const subtotals = watchedItems.map((item) => {
    const w = parseFloat(item?.weight ?? '')
    const p = parseFloat(item?.price ?? '')
    return !isNaN(w) && !isNaN(p) && w > 0 && p > 0 ? w * p : null
  })

  const total = subtotals.reduce<number>((acc, s) => acc + (s ?? 0), 0)

  // Materiales que todavía no están en la lista
  const usedIds = new Set(watchedItems.map((i) => i?.materialId))
  const availableToAdd = allMaterials.filter((m) => !usedIds.has(m.id))

  const handleAddMaterial = (materialId: string) => {
    const mat = allMaterials.find((m) => m.id === materialId)
    if (!mat) return
    append({
      materialId: mat.id,
      weight: '',
      price: prices[mat.name]?.toString() ?? '',
    })
  }

  const onSubmit = async (data: FormInput) => {
    setIsPrinting(true)
    try {
      const printItems: PrintItem[] = data.items
        .map((row): PrintItem | null => {
          const w = parseFloat(row.weight)
          const p = parseFloat(row.price)
          const mat = allMaterials.find((m) => m.id === row.materialId)
          if (!mat || isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return null
          return { materialName: mat.name as string, weight: w, price: p, subtotal: w * p }
        })
        .filter((i): i is PrintItem => i !== null)

      await qzPrint({
        items: printItems,
        total,
        date: new Date(),
      })

      toast.success('Ticket enviado a imprimir')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir'
      toast.error(msg)
      console.error('[Print]', err)
    } finally {
      setIsPrinting(false)
    }
  }

  const isManual = ocrResult.items.length === 0 && !capturedImageUrl

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      {/* Encabezado */}
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
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5 mr-1.5" />
          {isManual ? 'Volver' : 'Nuevo escaneo'}
        </Button>
      </div>

      {/* Imagen capturada */}
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

      {/* Tabla editable */}
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
                    <TableHead>Precio ($)</TableHead>
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

        {/* Botón agregar material */}
        {availableToAdd.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Plus className="size-4 text-muted-foreground shrink-0" />
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => { if (e.target.value) handleAddMaterial(e.target.value) }}
            >
              <option value="" disabled>Agregar material...</option>
              {availableToAdd.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center mt-4 px-1 border-t pt-4">
          <span className="text-lg font-semibold text-muted-foreground">Total</span>
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            $ {fmt(total)}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex justify-between items-center mt-6">
          {/* Indicador QZ Tray */}
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

          <Button type="submit" size="lg" disabled={isPrinting}>
            {isPrinting
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Imprimiendo...</>
              : <><Printer className="size-4 mr-2" />Imprimir ticket</>
            }
          </Button>
        </div>
      </form>

      {/* Panel debug OCR */}
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
