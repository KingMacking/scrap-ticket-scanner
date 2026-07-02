import { useState, useCallback } from 'react'
import { MATERIALS } from '@/data/materials'

const PRICES_KEY = 'scrap-prices-v2'
const CUSTOM_KEY = 'scrap-custom-materials-v2'

export type PricesMap = Record<string, number>

export interface MaterialInfo {
  id: string
  name: string
  defaultPrice: number
  aliases: readonly string[]
  isCustom: boolean
  orderIndex: number
}

interface CustomStore {
  customNames: string[]
  hiddenNames: string[]
}

const DEFAULT_CUSTOM: CustomStore = { customNames: [], hiddenNames: [] }
const DEFAULT_PRICES: PricesMap = Object.fromEntries(
  MATERIALS.map((m) => [m.name, m.defaultPrice])
)

function loadPrices(): PricesMap {
  try {
    const raw = localStorage.getItem(PRICES_KEY)
    const saved = raw ? (JSON.parse(raw) as PricesMap) : {}
    return { ...DEFAULT_PRICES, ...saved }
  } catch {
    return DEFAULT_PRICES
  }
}

function loadCustom(): CustomStore {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? (JSON.parse(raw) as CustomStore) : DEFAULT_CUSTOM
  } catch {
    return DEFAULT_CUSTOM
  }
}

let nextCustomId = 100

export function usePrices() {
  const [prices, setPrices] = useState<PricesMap>(loadPrices)
  const [custom, setCustom] = useState<CustomStore>(loadCustom)

  const buildMaterials = useCallback(
    (p: PricesMap, c: CustomStore): MaterialInfo[] => {
      const base = MATERIALS
        .filter((m) => !c.hiddenNames.includes(m.name))
        .map((m) => ({
          id: m.id,
          name: m.name,
          defaultPrice: m.defaultPrice,
          aliases: m.aliases,
          isCustom: false as const,
          orderIndex: m.orderIndex,
        }))
      const added = c.customNames
        .filter((n) => !c.hiddenNames.includes(n))
        .map((n, i) => ({
          id: `custom-${nextCustomId++}`,
          name: n,
          defaultPrice: p[n] ?? 0,
          aliases: [n.toLowerCase()] as readonly string[],
          isCustom: true as const,
          orderIndex: MATERIALS.length + i + 1,
        }))
      return [...base, ...added]
    },
    []
  )

  const [allMaterials, setAllMaterials] = useState<MaterialInfo[]>(() => buildMaterials(loadPrices(), loadCustom()))

  const persist = useCallback((p: PricesMap, c: CustomStore) => {
    localStorage.setItem(PRICES_KEY, JSON.stringify(p))
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(c))
    setPrices(p)
    setCustom(c)
    setAllMaterials(buildMaterials(p, c))
  }, [buildMaterials])

  const saveAll = useCallback((newPrices: PricesMap) => {
    persist(newPrices, custom)
  }, [persist, custom])

  const addMaterial = useCallback((name: string) => {
    const next = {
      customNames: custom.customNames.includes(name)
        ? custom.customNames
        : [...custom.customNames, name],
      hiddenNames: custom.hiddenNames.filter((h) => h !== name),
    }
    persist(prices, next)
  }, [persist, prices, custom])

  const removeMaterial = useCallback((name: string) => {
    const isCustom = custom.customNames.includes(name)
    const next: CustomStore = {
      customNames: isCustom ? custom.customNames.filter((c) => c !== name) : custom.customNames,
      hiddenNames: isCustom ? custom.hiddenNames : [...custom.hiddenNames, name],
    }
    persist(prices, next)
  }, [persist, prices, custom])

  return { prices, allMaterials, saveAll, addMaterial, removeMaterial }
}
