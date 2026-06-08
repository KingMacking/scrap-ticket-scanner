# 🏗️ Architecture

## Frontend

- React
- Vite

---

## Backend

- Supabase

---

## OCR

Inicialmente:
- Tesseract OCR
- OCR por regiones fijas

---

# 🧠 Estrategia OCR

El ticket siempre tiene la misma estructura.

Entonces:
- definir coordenadas por material
- recortar regiones
- procesar únicamente áreas necesarias

---

# 🔄 Flujo Técnico

1. Usuario sube imagen/PDF
2. Backend procesa OCR
3. Sistema detecta pesos
4. Se genera ticket digital
5. Usuario corrige valores
6. Ticket se imprime

---

# ⚠️ Validación

Siempre habrá validación humana antes de imprimir.