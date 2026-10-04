@AGENTS.md

# CLAUDE.md — Apurape

> Este archivo es el contexto maestro del proyecto. Cualquier sesión de Claude Code debe leerlo primero. Reemplaza cualquier referencia anterior a "MARKARU", "AgroDigital" o "agroexportación": este proyecto YA NO es eso.

## Qué es Apurape

Marketplace de servicios y productos generales tipo Thumbtack, para freelancers y negocios pequeños en Perú (luego LATAM). Conecta **Proveedores** (ofrecen servicios/productos) con **Clientes** (los buscan y contratan).

- **Slogan**: "Tú me ayudas, yo te ayudo"
- **Nombre**: de "apúrate, pe" (estilo Yape/Plin)
- **Colores**: rojo (principal), verde-teal (secundario), fondo blanco
- **Stack**: Next.js + TypeScript + Tailwind + Supabase + Vercel
- **Repo**: github.com/jair-h/apurape
- **Supabase**: proyecto `aueqmfaalfuefvucuwxl` (NO confundir con el de MARKARU, que es `mtrfzycmwdenpoxboewz` — son proyectos distintos, no comparten base de datos)
- **Bucket de storage**: `apurape` (público, con políticas de escritura por carpeta propia)

Historia del proyecto: es una copia adaptada del código de MARKARU (marketplace B2B agroexportador del mismo fundador), convertida en un producto totalmente distinto. Pueden quedar restos de texto heredados (nombres "agrodigital" en package.json, etc.) — son cosméticos, lo que define el proyecto es su repo y su Supabase propios.

## Roles

- **Proveedor** y **Cliente**, con **rol dual**: el mismo perfil puede actuar como ambos.
- Admin (cuenta del fundador, Jair — jairh798@gmail.com).

## Modelo de negocio

- **0% de comisión** sobre ventas. Ingreso solo por membresía anual del Proveedor. (Hay cláusula legal que reserva el derecho de introducir comisión en el futuro, pero HOY no se cobra ni se construye nada de eso.)
- **El Cliente NUNCA paga** nada, por nada. Es intencional: maximiza la demanda para dar valor a los Proveedores que pagan.
- **Planes del Proveedor**:
  - **Básico** (gratis permanente): perfil público, 3 conversaciones nuevas respondidas por mes, NO entra al concurso.
  - **Pro Persona**: S/120/año.
  - **Pro Negocio**: S/330/año.
- **Prueba**: todo Proveedor nuevo recibe Pro completo gratis su primer mes (plan_status='trial'). Al vencer sin pagar, cae a Básico gratis permanente (sin ocultar su perfil). Si paga, recibe un mes bonus adicional.

## Diferencias Persona vs Negocio

| | Persona | Negocio |
|---|---|---|
| Qué promociona | Al profesional | A la marca/negocio |
| Perfil | Nombre y foto personal | Nombre comercial + logo |
| RUC | No requiere | **Obligatorio** (no se completa el pago sin RUC válido, módulo 11) |
| Insignia | "Identidad verificada" (check teal) | "Negocio Verificado" (teal sólido, ícono local) — manual, aprobada por admin |
| Equipo | No aplica | Sección "Nuestro equipo" (fotos y nombres, sin cuentas separadas) |
| Banner de promoción | No | Sí, SOLO en su perfil público (nunca en búsqueda — pagar no da ventaja visual en el buscador) |
| Estadísticas | Básicas (calificación, trabajos, 5★) | Completas (Índice de Excelencia desglosado, tiempo de respuesta, serie por mes, posición en categoría) |
| Catálogo (grupo "productos": Comida, Belleza) | 15 ítems | 40 ítems |
| Catálogo (grupo "servicios": Reparaciones, Educación, Tecnología, Eventos, Hogar, Otros) | 5 ítems | 20 ítems |
| Fotos por ítem | 3 | 8 |

- El límite de catálogo cuenta solo servicios **activos** (los pausados no ocupan cuota).
- NO hay sucursales (descartado).
- Tarjeta de precios de Negocio en verde-teal (distinta de Básico/Persona).

## El Concurso Mensual (diferencial clave)

**Legalmente es un CONCURSO, no un sorteo** — el ganador se decide 100% por mérito medible, sin azar. Esto evita la licencia de sorteos que exige la ley peruana. NUNCA debe decidirse un ganador por azar entre elegibles: eso lo convertiría en sorteo y cambiaría el régimen legal.

- **Índice de Excelencia** (por categoría y tipo Persona/Negocio): 50% calidad (promedio de calificación), 30% volumen normalizado dentro de la categoría, 20% velocidad de respuesta.
- **Requisito para participar**: mínimo 3 trabajos confirmados en el mes + promedio general ≥3.0 estrellas. Solo Pro entra (el Básico no).
- El mes de un trabajo se ancla a cuándo se **completó** (no cuándo se confirmó), para evitar manipulación. Se marca si el proveedor era Pro al momento del trabajo (jobs.provider_was_pro), para que un trial que trabajó como Pro no quede fuera.
- **Cierre automático** el día 3 del mes siguiente (pg_cron), con margen para confirmaciones tardías. Determina ganador, asigna insignia, notifica.
- **Insignia de ganador** (teal): en perfil público y como etiqueta en búsqueda.
- **Clientes** también participan (puntos, niveles, su propio concurso) sin pagar.
- Solo la confirmación del **Cliente** valida una venta (nunca la del Proveedor). Antifraude: se excluyen pares recíprocos entre Proveedores.
- **Premios**: empiezan internos gratis (upgrade, destacado, insignia). Premios en efectivo/cursos/financiamiento se activan después, cuando los ingresos los sostengan. No prometer premios que no se puedan financiar (riesgo INDECOPI).
- **Elección de premio al registrarse** (aspiracional, no garantizado): Persona elige entre curso/certificación, kit de herramientas, mentoría 1:1. Negocio entre fondo para insumos/equipo, campaña de marketing, capacitación de equipo.

### Dos reglas aplazadas, deliberadamente NO implementadas

Hasta después del lanzamiento, cuando haya premios en efectivo y cientos de usuarios. El detalle y lo que implicaría cada una está en el encabezado de `supabase/migrations/033_raffle_requirement.sql`:

1. **Un premio por perfil al mes.** Hoy el mismo proveedor puede ganar en varias categorías el mismo mes.
2. **Mínimo de participantes por categoría.** Hoy, con un solo participante que clasifique, ese gana.

Con premios simbólicos ninguna hace falta; con dinero, ambas pasan a importar. No deducir de esta nota que existen.

## Sistema de niveles / Gran Meta (DISEÑADO, NO CONSTRUIR TODAVÍA)

Hay un sistema progresivo de niveles (Inicio → Impulso → Crece → Destaca → Elite → Gran Meta) basado en "puntos de progreso" acumulados de por vida (= Índice de Excelencia acumulado, normalizado por categoría). Desbloquear un nivel da elegibilidad para premios mayores, no el premio automático. Premios grandes (moto, auto, vivienda) dependen de patrocinio o meta comunitaria financiada por ingresos reales. **Esto NO se construye hasta después de lanzar y tener datos reales de usuarios.** No implementar sin pedido explícito.

## Reglas de trabajo con este proyecto

- Mostrar el plan antes de aplicar cambios en la base de datos.
- Las migraciones se aplican a veces por `apply_migration` (que ha fallado) y a veces directo en el SQL editor de Supabase — el usuario tiene ayuda externa que puede aplicar SQL directo.
- Cuando una migración borra o renombra algo que el código usa, **la migración va antes del despliegue**, no al revés.
- No romper el argumento legal del concurso (mérito, no azar; no premios impagables).
- Si cambia una regla del concurso, revisar también la página pública de Bases (`src/app/concurso/page.tsx`): es un documento que debe coincidir con lo que hace el sistema.
- MARKARU es un proyecto separado (otra carpeta, otro repo, otro Supabase) — nunca tocarlo.

## Estado actual (oct 2026)

**Construido, probado y subido** — migraciones 001 a 033 aplicadas:

- Base de datos completa y flujo Proveedor↔Cliente (chat, cotizaciones, trabajos, calificaciones).
- Concurso mensual con Índice de Excelencia, cierre automático en `pg_cron` (día 3, 05:00 UTC), insignia y aviso al ganador. Primera corrida real: 3 de octubre de 2026, correcta.
- Vencimientos diarios en `pg_cron` (`expire_plans`, 05:10 UTC).
- Límite del Básico por conversaciones nuevas; mes de prueba Pro completo que cae a Básico.
- RUC obligatorio (módulo 11) e insignia diferenciada; filtro "Negocios verificados" en el buscador.
- Diferencias Persona/Negocio completas: logo, equipo, banner de promoción, estadísticas, catálogo con límites por grupo, editor de fotos, tarjeta de precios en teal.
- Elección de premio al registrarse, y `account_type` guardado desde el registro.
- Requisito del concurso (3 trabajos + ≥3.0) con los umbrales en `config`.
- Dos cláusulas legales nuevas en Términos: comisión futura y publicidad.

**Pendiente del usuario (no código)**:

- Crear los 2 planes en Culqi (`plan-pro-persona-apurape`, `plan-pro-negocio-apurape`) y probar un pago completo. Es lo único de los ocho bloques sin verificar.
- Variables de entorno en Vercel, en especial `SUPABASE_SERVICE_ROLE_KEY`: sin ella Culqi cobra y el plan no se activa.
- Plantilla Brevo del correo al ganador + `BREVO_WINNER_TEMPLATE_ID`. Sin la variable, el endpoint no marca nada como enviado y recoge los pendientes cuando exista.
- Comprar dominio (apurape.com / .pe) y crear el correo dedicado para la sección 6 de Privacidad, que sigue como `[PENDIENTE]`.
- Revisión de abogado de Términos, Bases y Acta de Entrega antes del primer premio en efectivo.

**Siguiente hito**: el cierre del **3 de noviembre de 2026** es el primero que puede tener datos reales. Conviene revisar a mano los concursos premiados antes de entregar nada: el de octubre corrió con la base casi vacía.
