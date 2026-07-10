import { useState, useCallback } from 'react'
import { MATERIALS } from '@/data/materials'

const PRICES_KEY = 'scrap-prices-v3'
const PRICES_KEY_OLD = 'scrap-prices-v2'
const CUSTOM_KEY = 'scrap-custom-materials-v2'
const DEFAULTS_KEY = 'scrap-default-materials-v2'

const DEFAULT_ORDERS: Record<string, number> = {
  Chatarra: 1,
  Carton: 2,
  Mezcla: 3,
  Cobre: 4,
  Bronce: 5,
  Aluminio: 6,
  Plomo: 7,
}

export interface PriceEntry {
  purchase: number
  sale: number
}

export type PricesMap = Record<string, PriceEntry>

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
  MATERIALS.map((m) => [m.name, { purchase: m.defaultPrice, sale: m.defaultPrice }])
)

function loadPrices(): PricesMap {
  try {
    const raw = localStorage.getItem(PRICES_KEY)
    if (raw) {
      return { ...DEFAULT_PRICES, ...JSON.parse(raw) }
    }
    // Migrate from old flat format (Record<string, number>)
    const oldRaw = localStorage.getItem(PRICES_KEY_OLD)
    if (oldRaw) {
      const old = JSON.parse(oldRaw) as Record<string, number>
      const migrated: PricesMap = {}
      for (const [name, price] of Object.entries(old)) {
        migrated[name] = { purchase: price, sale: price }
      }
      localStorage.setItem(PRICES_KEY, JSON.stringify(migrated))
      localStorage.removeItem(PRICES_KEY_OLD)
      return { ...DEFAULT_PRICES, ...migrated }
    }
    return DEFAULT_PRICES
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

function loadDefaultOrders(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : DEFAULT_ORDERS
  } catch {
    return DEFAULT_ORDERS
  }
}

let nextCustomId = 100

export function usePrices() {
  const [prices, setPrices] = useState<PricesMap>(loadPrices)
  const [custom, setCustom] = useState<CustomStore>(loadCustom)
  const [defaultMaterialOrders, setDefaultMaterialOrders] = useState<Record<string, number>>(loadDefaultOrders)

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
          defaultPrice: p[n]?.purchase ?? 0,
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

  const updateDefaultMaterialOrders = useCallback((orders: Record<string, number>) => {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(orders))
    setDefaultMaterialOrders(orders)
  }, [])

  return { prices, allMaterials, saveAll, addMaterial, removeMaterial, defaultMaterialOrders, setDefaultMaterialOrders: updateDefaultMaterialOrders }
}
