@AGENTS.md

# Proyecto: Apurape

Marketplace de servicios para Perú: conecta Proveedores (quien ofrece un
servicio o producto) con Clientes (quien lo busca). Apurape es un nombre
propio, no se traduce. El eslogan es "Tú me ayudas, yo te ayudo".

Modelo: 0% de comisión sobre las ventas. Solo paga el Proveedor, solo el
plan Pro, y solo por año — S/120 Persona, S/330 Negocio. El Cliente nunca
paga. El diferenciador es el Concurso Mensual por categoría, que se decide
con el Índice de Excelencia (calidad 50%, volumen 30%, velocidad 20%).

## Decisiones aplazadas del concurso

Dos reglas discutidas y **deliberadamente no implementadas** hasta después
del lanzamiento, cuando haya premios en efectivo y cientos de usuarios. El
detalle y lo que implicaría cada una está en
`supabase/migrations/033_raffle_requirement.sql`:

1. **Un premio por perfil al mes.** Hoy el mismo proveedor puede ganar en
   varias categorías el mismo mes.
2. **Mínimo de participantes por categoría.** Hoy, con un solo
   participante que clasifique, ese gana.

Con premios simbólicos ninguna hace falta; con dinero, ambas pasan a
importar. No deducir de esta nota que existen.
