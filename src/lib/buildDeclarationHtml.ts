export interface DeclarationItem {
  materialName: string
  weight: number
}

export interface DeclarationData {
  sellerName: string
  sellerDni: string
  sellerAddress: string
  items: DeclarationItem[]
  date: Date
}

/** Materiales que van al detalle de la declaración: cobre y/o bronce. */
export function isDeclarationMaterial(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('cobre') || n.includes('bronce')
}

/** "SAN MARTÍN 2538, CAÑUELAS - CAÑUELAS - BUENOS AIRES" -> calle / número / localidad */
export function splitAddress(address: string): { street: string; number: string; city: string } {
  const trimmed = address.trim().replace(/\s+/g, ' ')
  if (!trimmed) return { street: '', number: '', city: '' }

  // El domicilio del DNI puede venir con coma o con guiones como separador:
  //   "SAN MARTÍN 2538, CAÑUELAS - BUENOS AIRES"
  //   "SAN MARTÍN 2538 - CAÑUELAS - BUENOS AIRES"
  const parts = trimmed.split(/\s*[,-]\s*/).filter(Boolean)
  const streetPart = (parts[0] ?? '').trim()
  const city = parts.slice(1).join(' - ').trim()

  // El número es lo que queda al final del primer bloque
  const match = streetPart.match(/^(.*\S)\s+(\d+[a-zA-Z]?)$/)
  if (!match) return { street: streetPart, number: '', city }

  // Sacamos un "N°" suelto que puede venir pegado al nombre de la calle
  const street = match[1]
    .trim()
    .replace(/\s+(n[°º.]?|nro\.?|núm\.?|numero)$/i, '')
    .trim()

  return { street, number: match[2], city }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Valor si existe; si no, un espacio en blanco para completar a mano. */
function field(value: string, size: 'sm' | 'md' | 'lg'): string {
  const trimmed = value.trim()
  if (trimmed) return `<span class="fill">${escapeHtml(trimmed)}</span>`
  return `<span class="fill blank w-${size}"></span>`
}

function fmtWeight(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

export function buildDeclarationHtml(data: DeclarationData): string {
  const { street, number, city } = splitAddress(data.sellerAddress)
  const date = data.date.toLocaleDateString('es-AR')
  const time = data.date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const rows = data.items
    .filter((i) => i.weight > 0)
    .map(
      (i) => `<tr>
        <td>${escapeHtml(i.materialName)}</td>
        <td class="num">${fmtWeight(i.weight)}</td>
      </tr>`
    )
    .join('')

  const detailRows = rows || `<tr><td>&nbsp;</td><td>&nbsp;</td></tr>`

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8" />
<title>Declaración jurada de venta de metales no ferrosos</title>
<style>
  @page { size: A4; margin: 18mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5pt;
    line-height: 1.7;
    color: #000;
    margin: 0;
    background: #fff;
  }
  /* En pantalla simulamos la hoja A4 con los mismos márgenes del papel */
  @media screen {
    body {
      max-width: 794px;
      margin: 32px auto;
      padding: 68px 76px;
    }
  }
  h1 {
    font-size: 13.5pt;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 26px;
  }
  p.body { text-align: justify; margin: 0 0 14px; }
  .fill {
    border-bottom: 1px solid #000;
    padding: 0 1px;
    font-weight: 600;
  }
  .fill.blank { display: inline-block; font-weight: 400; }
  .w-sm { min-width: 90px; }
  .w-md { min-width: 220px; }
  .w-lg { min-width: 330px; }
  h2 {
    font-size: 12pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 26px 0 8px;
  }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; }
  th { background: #f0f0f0; font-size: 10pt; text-transform: uppercase; }
  td.num { text-align: right; width: 130px; }
  .sign { display: flex; gap: 40px; margin-top: 52px; break-inside: avoid; }
  .sign .col { flex: 1; }
  .sign .line {
    border-bottom: 1px solid #000;
    height: 34px;
    display: flex;
    align-items: flex-end;
    font-weight: 600;
    padding-bottom: 2px;
  }
  .sign .lbl { font-size: 9.5pt; color: #333; margin-top: 4px; }
  .sign.second { margin-top: 30px; }
</style>
</head>
<body>
  <h1>Declaración jurada de venta de metales no ferrosos</h1>

  <p class="body">
    En el día <span class="fill">${date}</span> a la hora <span class="fill">${time}</span>,
    ${field(data.sellerName, 'lg')} DNI N° ${field(data.sellerDni, 'sm')}, con domicilio en calle
    ${field(street, 'md')} N° ${field(number, 'sm')} de la ciudad/localidad de ${field(city, 'md')},
    declaro bajo juramento que los metales no ferrosos que se detallan en el presente escrito son de
    mi única y exclusiva responsabilidad por ser la única persona que conoce su procedencia. A tales
    efectos se acompaña fotocopia de DNI del vendedor. En consecuencia, queda liberado de
    responsabilidad civil y/o penal, el comprador de los metales no ferrosos que se detallan a
    continuación.
  </p>

  <h2>Detalle:</h2>
  <table>
    <thead>
      <tr>
        <th>Material</th>
        <th class="num">Peso (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
    </tbody>
  </table>

  <div class="sign">
    <div class="col">
      <div class="line"></div>
      <div class="lbl">Firma</div>
    </div>
    <div class="col">
      <div class="line"></div>
      <div class="lbl">Aclaración</div>
    </div>
  </div>

  <div class="sign second">
    <div class="col">
      <div class="line"></div>
      <div class="lbl">DNI</div>
    </div>
    <div class="col">
      <div class="line"></div>
      <div class="lbl">Dominio vehículo</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre el documento en una ventana nueva y dispara el diálogo de impresión
 * del navegador (permite elegir otra impresora, no usa QZ Tray).
 */
export function printDeclaration(data: DeclarationData): boolean {
  const html = buildDeclarationHtml(data)
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false

  win.document.open()
  win.document.write(html)
  win.document.close()

  window.setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch {
      /* el usuario puede imprimir con Ctrl+P */
    }
  }, 400)

  return true
}
