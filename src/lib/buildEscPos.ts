/**
 * Genera una secuencia ESC/POS para impresoras térmicas de 80mm (48 chars/línea).
 * Retorna un array de strings que QZ Tray envía directamente a la impresora.
 */

const COLS = 48

// Comandos ESC/POS
const ESC = '\x1B'
const GS  = '\x1D'

const CMD = {
  INIT:           ESC + '@',
  ALIGN_LEFT:     ESC + 'a\x00',
  ALIGN_CENTER:   ESC + 'a\x01',
  ALIGN_RIGHT:    ESC + 'a\x02',
  BOLD_ON:        ESC + 'E\x01',
  BOLD_OFF:       ESC + 'E\x00',
  DOUBLE_SIZE_ON: GS  + '!\x11',   // doble ancho + doble alto
  DOUBLE_SIZE_OFF:GS  + '!\x00',
  FEED_2:         ESC + 'd\x02',
  FEED_4:         ESC + 'd\x04',
  CUT:            GS  + 'V\x41\x00', // corte parcial
  LF:             '\n',
}

function line(str: string): string {
  return str + CMD.LF
}

function divider(char = '-'): string {
  return line(char.repeat(COLS))
}

/** Tres columnas: izquierda, centro (alineado a la derecha), derecha */
function row3(left: string, mid: string, right: string): string {
  const midW = 8
  const rightW = 14
  const leftW = COLS - midW - rightW - 2
  const truncated = left.length > leftW ? left.slice(0, leftW - 1) + '…' : left
  const midPad = Math.max(1, midW - mid.length)
  const rightPad = Math.max(1, rightW - right.length)
  return line(truncated + ' '.repeat(leftW - truncated.length + 1) + ' '.repeat(midPad) + mid + ' '.repeat(rightPad) + right)
}

/** Formatea número como moneda argentina sin decimales */
function fmt(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Formatea número como entero sin signo monetario */
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export interface PrintItem {
  materialName: string
  weight: number
  price: number
  subtotal: number
}

export interface PrintTicketData {
  items: PrintItem[]
  total: number
  date: Date
}

export function buildEscPos(data: PrintTicketData): string[] {
  const { items, total, date } = data

  const dateStr = date.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  const lines: string[] = []

  const push = (...cmds: string[]) => lines.push(...cmds)

  // Inicializar impresora
  push(CMD.INIT)

  // Encabezado — solo fecha y hora, centrado
  push(CMD.ALIGN_CENTER)
  push(line(`${dateStr}  ${timeStr}`))
  push(CMD.ALIGN_LEFT)
  push(divider('='))

  // Cabecera de columnas
  push(CMD.BOLD_ON)
  push(row3('MATERIAL', '$/KG', 'TOTAL'))
  push(CMD.BOLD_OFF)
  push(divider('-'))

  // Filas de materiales
  for (const item of items) {
    push(row3(`${item.materialName} (${item.weight} kg)`, fmtNum(item.price), fmt(item.subtotal)))
  }

  push(divider('='))

  // Total en grande
  push(CMD.ALIGN_RIGHT)
  push(CMD.BOLD_ON, CMD.DOUBLE_SIZE_ON)
  push(line(`TOTAL  ${fmt(total)}`))
  push(CMD.DOUBLE_SIZE_OFF, CMD.BOLD_OFF)

  // Espacio y corte
  push(CMD.FEED_4)
  push(CMD.CUT)

  return lines
}
