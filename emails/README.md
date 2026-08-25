# Plantillas de email — MARKARU

Plantillas HTML (estilo verde MARKARU, estilos inline compatibles con clientes de correo).
Se envían desde una herramienta externa (Brevo). Reemplaza los `[placeholders]` con las
variables/merge tags de tu plataforma.

| # | Archivo | Cuándo | Asunto |
|---|---------|--------|--------|
| 1 | `email-1-bienvenida.html` | Al registrarse | `¡Bienvenido a MARKARU! 🌱 Tu cuenta ya está activa` |
| 2 | `email-2-pago-confirmado.html` | Tras un pago exitoso | `Pago confirmado ✅ Tu plan MARKARU está activo` |
| 3 | `email-3-trial-vence.html` | 3 días antes de vencer el trial | `Tu acceso gratuito vence en 3 días ⏰` |

## Placeholders
- `[nombre]` — nombre del usuario
- `[fecha]` — fecha de vencimiento del trial (email 3)
- `[precio]` — precio anual según rol (ver tabla)
- `[diario]` — costo diario aproximado (ver tabla)
- `[plan]` — nombre del plan (email 2)
- `[orden]` — número de orden / charge_id del pago (email 2)
- `[duracion]` — `13 meses` si pagó durante el trial, `12 meses` si pagó después (email 2)
- `[fecha_vencimiento]` — fecha en que expira el plan pagado (email 2)
- `[rol]` + `[plan]` — para armar el botón `/activar-plan?rol=[rol]&plan=[plan]` (email 3)

## Precios y enlace de checkout por rol

| Rol | `[precio]` | `[diario]` | Botón `rol=…&plan=…` |
|-----|-----------|-----------|----------------------|
| Productor | USD 120/año | S/ 1.25 | `rol=productor&plan=productor` |
| Exportador | USD 360/año | S/ 3.75 | `rol=exportador&plan=basic` |
| Exportador PRO | USD 960/año | S/ 10 | `rol=exportador&plan=pro` |
| Forwarder | USD 600/año | S/ 6.25 | `rol=forwarder&plan=basic` |
| Forwarder PRO | USD 1,200/año | S/ 12.50 | `rol=forwarder&plan=pro` |
| Certificadora | USD 720/año | S/ 7.50 | `rol=certificadora&plan=basic` |
| Certificadora Premium | USD 1,200/año | S/ 12.50 | `rol=certificadora&plan=premium` |

## Variantes de EMAIL 3 por rol (precio y link ya incrustados)
En `emails/email-3/` hay una plantilla por rol con el precio, el costo diario y el
enlace de checkout ya escritos (solo quedan `[nombre]` y `[fecha]` como merge tags):

| Archivo | Precio | Checkout |
|---------|--------|----------|
| `email-3/productor.html` | USD 120/año | `?rol=productor&plan=productor` |
| `email-3/exportador.html` | USD 360/año | `?rol=exportador&plan=basic` |
| `email-3/exportador-pro.html` | USD 960/año | `?rol=exportador&plan=pro` |
| `email-3/forwarder.html` | USD 600/año | `?rol=forwarder&plan=basic` |
| `email-3/forwarder-pro.html` | USD 1,200/año | `?rol=forwarder&plan=pro` |
| `email-3/certificadora.html` | USD 720/año | `?rol=certificadora&plan=basic` |
| `email-3/certificadora-premium.html` | USD 1,200/año | `?rol=certificadora&plan=premium` |

> Nota: el plan de Exportador usa `plan=basic` (no `plan=exportador`) y el de Certificadora `plan=basic`/`plan=premium` — así lo reconoce `/activar-plan`; con otros valores redirigiría a `/planes`.

## Nota
El bonus de "1 mes extra" (13 meses) del email 3 ya está respaldado en el código:
`/api/culqi/charge` activa 13 meses si el pago ocurre con `plan_status = 'trial'`, y 12 meses si no.
