import { useState, useCallback } from 'react'
import { MATERIALS } from '@/data/materials'

// Incrementar la versión cuando cambie la lista de materiales o su estructura
const STORAGE_KEY = 'scrap-prices-v2'

export type PricesMap = Record<string, number>

/** Precios por defecto definidos en materials.ts, indexados por nombre */
const DEFAULT_PRICES: PricesMap = Object.fromEntries(
  MATERIALS.map((m) => [m.name, m.defaultPrice])
)

function loadPrices(): PricesMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? (JSON.parse(raw) as PricesMap) : {}
    // Defaults como base; lo guardado por el usuario sobreescribe solo lo que coincide por nombre
    return { ...DEFAULT_PRICES, ...saved }
  } catch {
    return DEFAULT_PRICES
  }
}

export function usePrices() {
  const [prices, setPrices] = useState<PricesMap>(loadPrices)

  const saveAll = useCallback((newPrices: PricesMap) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrices))
    setPrices(newPrices)
  }, [])

  return { prices, saveAll }
}
