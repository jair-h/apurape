-- ============================================================
-- APURAPE · 020 · Horario de atención del Proveedor
-- ============================================================
-- Formato:
--   {"lun":[["09:00","13:00"],["15:00","19:00"]],
--    "mar":[["09:00","19:00"]],
--    "dom":[]}
--
-- Varios rangos por día porque el horario partido (refrigerio) es lo normal
-- en un oficio. Con columnas fijas habría que inventar apertura_2/cierre_2
-- y el problema reaparece con el tercer rango.
--
-- Día ausente o array vacío = cerrado ese día.
-- Objeto vacío {} = el proveedor todavía no definió horario. La UI muestra
-- "Horario no especificado", que NO es lo mismo que "Cerrado".
--
-- Las horas se interpretan siempre en hora de Lima. No se guarda zona por
-- proveedor: cuando Apurape salga de Perú habrá que añadirla.
--
-- El CHECK solo verifica que sea un objeto, a propósito. Validar la
-- estructura completa en SQL sería frágil y molesto de cambiar; la forma la
-- garantiza el formulario y el lector tolera datos raros mostrando
-- "no especificado" en vez de fallar.
-- ============================================================

alter table public.profiles
  add column business_hours jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_business_hours_is_object
  check (jsonb_typeof(business_hours) = 'object');

comment on column public.profiles.business_hours is
  'Horario de atención en hora de Lima. {"lun":[["09:00","13:00"]], ...}. Vacío = no especificado.';
