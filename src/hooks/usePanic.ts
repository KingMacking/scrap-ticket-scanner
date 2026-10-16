import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/** Página neutra a la que se redirige al activar el pánico. */
const PANIC_REDIRECT = 'https://www.google.com'

/**
 * Botón de pánico.
 *
 * Al dispararse, en el equipo local:
 *  1. Tapa la pantalla al instante (overlay opaco).
 *  2. Borra los datos locales: token de sesión de Supabase, precios, etc.
 *  3. Cierra la sesión y redirige a una página neutra.
 *
 * IMPORTANTE: esto NO borra nada de la base de datos. Los tickets y los gastos
 * viven en Supabase y siguen ahí; esto solo deja ESTE equipo sin datos ni sesión.
 * Para cortar el acceso de un equipo robado hay que revocar la sesión del lado
 * de Supabase (cerrar sesión en todos los dispositivos).
 */
export function usePanic() {
  const trigger = useCallback(() => {
    // 1) Tapar la pantalla ya mismo, antes de cualquier await
    const cover = document.createElement('div')
    cover.setAttribute('data-panic-cover', 'true')
    cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#ffffff;'
    document.body.appendChild(cover)

    // 2) Borrar todo lo local (token de sesión, precios, preferencias)
    try { localStorage.clear() } catch { /* ignorar */ }
    try { sessionStorage.clear() } catch { /* ignorar */ }

    // 3) Cerrar sesión (local, sin depender de la red) y salir a una página neutra
    const redirect = () => window.location.replace(PANIC_REDIRECT)
    void supabase.auth.signOut({ scope: 'local' }).then(redirect, redirect)
    // Fallback: si signOut no resuelve, redirigir igual
    window.setTimeout(redirect, 300)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        trigger()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [trigger])

  return { trigger }
}
