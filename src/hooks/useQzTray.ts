/**
 * Hook para comunicarse con QZ Tray via su librería oficial.
 * Firma las solicitudes con el certificado generado desde QZ Tray Site Manager.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import qz from 'qz-tray'
import type { PrintTicketData } from '@/lib/buildEscPos'
import { buildEscPos } from '@/lib/buildEscPos'

export type QzStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const CERTIFICATE = (import.meta.env.VITE_QZ_CERTIFICATE as string ?? '').replace(/\\n/g, '\n')
const PRIVATE_KEY  = (import.meta.env.VITE_QZ_PRIVATE_KEY  as string ?? '').replace(/\\n/g, '\n')

/**
 * Firma `toSign` con la clave privada RSA usando SHA-256 + Web Crypto API.
 * QZ Tray espera la firma en Base64.
 */
async function signData(toSign: string): Promise<string> {
  const pemBody = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign'],
  )

  const dataBytes = new TextEncoder().encode(toSign)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBytes)

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export function useQzTray() {
  const [status, setStatus]         = useState<QzStatus>('disconnected')
  const [printerName, setPrinterName] = useState<string | null>(null)
  const connectingRef = useRef(false)

  const connect = useCallback(async () => {
    if (connectingRef.current || status === 'connected') return
    connectingRef.current = true
    setStatus('connecting')

    try {
      // Certificado generado desde QZ Tray Site Manager
      qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
        resolve(CERTIFICATE)
      })

      // Firma cada solicitud con la clave privada
      qz.security.setSignatureAlgorithm('SHA512')
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: (sig: string) => void, reject: (err: unknown) => void) => {
          signData(toSign).then(resolve).catch(reject)
        }
      })

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 })
      }

      const printer: string = await qz.printers.getDefault()
      setPrinterName(printer)
      setStatus('connected')
      console.log('[QZ Tray] conectado. Impresora:', printer)
    } catch (err) {
      console.error('[QZ Tray] error de conexión:', err)
      setStatus('error')
    } finally {
      connectingRef.current = false
    }
  }, [status])

  const disconnect = useCallback(async () => {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect()
      }
    } catch (_) { /* ignorar */ }
    setStatus('disconnected')
    setPrinterName(null)
  }, [])

  const print = useCallback(async (data: PrintTicketData, targetPrinter?: string): Promise<void> => {
    if (status !== 'connected') {
      await connect()
    }

    if (!qz.websocket.isActive()) {
      throw new Error('QZ Tray no está activo. Asegurate de que esté corriendo en la barra de tareas.')
    }

    const printer = targetPrinter ?? printerName
    if (!printer) {
      throw new Error('No se encontró ninguna impresora predeterminada.')
    }

    const config = qz.configs.create(printer, {
      encoding: 'ISO-8859-1',
      copies: 1,
    })

    const escPosLines = buildEscPos(data)
    const printData = escPosLines.map((chunk) => ({
      type: 'raw',
      format: 'plain',
      data: chunk,
    }))

    await qz.print(config, printData)
    console.log('[QZ Tray] trabajo enviado a:', printer)
  }, [status, connect, printerName])

  useEffect(() => {
    connect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, printerName, connect, disconnect, print }
}
