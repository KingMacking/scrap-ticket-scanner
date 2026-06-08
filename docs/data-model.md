# 🗂️ Data Model

## tickets

- id
- ticket_number
- created_at
- status
- original_image_url

---

## ticket_items

- id
- ticket_id
- material_name
- detected_weight
- corrected_weight
- price

---

## materials

- id
- name
- order_index

---

## scans

- id
- ticket_id
- image_url
- ocr_status
- created_at

---

## users (future)

- id
- name
- role