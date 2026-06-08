# 🧩 Product Spec — Sistema de Digitalización de Tickets

## 🎯 Objetivo

Automatizar el registro de tickets físicos de materiales mediante OCR y generar tickets digitales editables e imprimibles.

---

# 🧾 Flujo General

## Paso 1 — Ticket físico

- Ticket impreso con estructura fija
- Tabla de materiales
- Operario escribe pesos manualmente

---

## Paso 2 — Escaneo

Input soportado:
- Imagen
- PDF
- Scanner
- Cámara (futuro)

---

## Paso 3 — OCR

El sistema:
- Detecta valores manuscritos
- Relaciona cada valor con su material
- Genera ticket digital automáticamente

---

## Paso 4 — Revisión manual

Usuario puede editar únicamente:
- peso/cantidad
- precio

Los demás campos:
- bloqueados

---

## Paso 5 — Impresión

El ticket digital:
- puede imprimirse
- puede almacenarse

---

# 🎯 Problemas que resuelve

- Reducir tiempo operativo
- Reducir errores humanos
- Automatizar impresión
- Digitalizar registros

---

# ⚠️ Riesgos

- OCR manuscrito incorrecto
- Mala calidad de imagen
- Escritura poco clara

---

# ✅ Ventaja clave

El ticket físico SIEMPRE tiene la misma estructura.

Esto permite:
- OCR por coordenadas
- Parsing controlado
- Menor margen de error