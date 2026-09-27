# Invitación de boda

Invitación digital con sobre en video, personalizada por invitado. Cada invitado
recibe un enlace con su propio identificador y la página saluda a esa persona por
su nombre.

```
https://nuptial-steel.vercel.app/?guest=<uuid-del-invitado>
```

Sin servicios externos de datos: la lista de invitados vive en un archivo JSON
del repositorio y el panel de administración escribe en ese mismo archivo.

## Requisitos

- [Bun](https://bun.sh) 1.4 o superior
- Node.js 20 o superior (para los scripts auxiliares)

## Puesta en marcha

```bash
bun install
cp .env.example .env.local     # y rellena ADMIN_SESSION_SECRET
bun run password               # genera el usuario admin (ver abajo)
bun run dev
```

Abre `http://localhost:3000/admin`, entra con el usuario que acabas de crear y
añade invitados. Cada uno recibe un enlace `/?guest=<uuid>`.

## Variables de entorno

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `ADMIN_SESSION_SECRET` | Sí | Firma la cookie de sesión. Mínimo 32 caracteres. Sin ella el panel no deja entrar a nadie. |
| `BLOB_READ_WRITE_TOKEN` | Solo en Vercel | Guarda los datos en Vercel Blob en vez de en el disco. |
| `DATA_DRIVER` | No | Fuerza el almacén: `json` o `blob`. Por defecto se elige solo. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | No | Solo para `bun run export`, la migración de una vez. |

Genera el secreto con:

```bash
openssl rand -hex 32
```

## Dónde viven los datos

`lib/data/store.ts` tiene dos almacenes y elige entre ellos:

- **`data/invitados.json` y `data/usuarios.json`** — por defecto, y siempre en
  desarrollo. Las escrituras son atómicas y se serializan con un cerrojo para que
  dos peticiones simultáneas no se pisen.
- **Vercel Blob** — cuando existe `BLOB_READ_WRITE_TOKEN`.

El desarrollo local usa el archivo; en Vercel hay que activar el Blob, porque el
filesystem de una función serverless no se conserva entre invocaciones.

### `data/invitados.json`

```json
[
  {
    "id": "8de7942d-5be7-433d-a6ae-f71d345a0ecf",
    "full_name": "María García",
    "email": "maria@example.com",
    "gender": "female",
    "plus_ones": 2,
    "is_courtesy": false,
    "courtesy_plus_ones": 0,
    "is_godparent": true,
    "is_attending": null,
    "phone": null,
    "gift_type": null,
    "gift_description": null,
    "gift_amount_usd": null,
    "gift_amount_bs": null,
    "created_at": "2026-01-01T12:00:00.000Z",
    "updated_at": "2026-01-01T12:00:00.000Z"
  }
]
```

El `id` es un UUID y a la vez el secreto del enlace. Cualquiera que lo adivine
ve la invitación de esa persona, así que trátalo como una credencial: no lo
publicues en listas, imágenes de redes sociales ni capturas.

`gender` es `"male"`, `"female"` o `null`, y decide el saludo (`Querido` /
`Querida` / `Querido/a`) y el texto de padrino o madrina. `gift_type` solo
acepta `fisico`, `efectivo`, `pago_movil`, `binance`, `paypal` u `otro`.

### `data/usuarios.json`

Cuentas del panel. La contraseña nunca se guarda en claro: es `scrypt` con una
sal por usuario.

```bash
bun run password
```

Imprime el objeto que hay que añadir al arreglo. El script pide la contraseña de
forma interactiva si no se le pasa como argumento, para que no quede en el
historial del shell.

## Migrar desde Supabase

Una sola vez, para traer los invitados que ya estaban en Supabase:

```bash
SUPABASE_URL=https://tuproyecto.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
bun run export
```

Descarga la tabla `guests` completa y escribe `data/invitados.json` conservando
los UUID, de modo que los enlaces ya enviados siguen funcionando. Necesita la
clave de **service role** (Configuración → API), no la anon.

Después entra al panel y usa **Importar invitados.json** para subir el archivo.
La importación *reemplaza* la lista completa y avisa cuántas filas importó y
cuántas omitió. Omitidas son las que no traen un `id` válido (sin él no hay
enlace que construir) y las que repiten un correo ya presente.

Cuando termines, borra `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno.

## Panel de administración

`/admin`, detrás de login. Se protege con `proxy.ts` y las sesiones se vuelven a
comprobar en cada ruta de API, así que el bloqueo no depende de una sola capa.

- Listado con confirmación y regalo de cada invitado, ordenados del más reciente
  al más antiguo, refrescado cada 15 segundos
- Crear invitados, editar nombre y sexo, borrar
- Importar un `invitados.json`

La cookie de sesión es un payload firmado con HMAC-SHA256 que incluye expiración.
El rol no se toma de la cookie: `lib/auth/server.ts` relee el usuario del archivo
en cada petición, así que falsificarla no concede nada.

## API

Públicas, necesitan el UUID del invitado:

```
POST /api/rsvp   { guestId, attending }
POST /api/gift   { guestId, gift_type, gift_amount_bs?, gift_amount_usd?, gift_description? }
```

Del panel, necesitan la cookie de sesión:

```
GET    /api/admin/guests
POST   /api/admin/guests          { full_name, email, gender?, plus_ones?, ... }
PATCH  /api/admin/guests/<id>
DELETE /api/admin/guests/<id>
POST   /api/admin/import          [ ...invitados ]
GET    /api/admin/session
```

`/api/rsvp` solo puede cambiar `is_attending`, y `/api/gift` solo los campos del
regalo. Un invitado que manipule su propia petición no puede tocar su nombre, su
correo ni el número de acompañantes.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run start` | Sirve el build |
| `bun run password` | Genera un usuario para `data/usuarios.json` |
| `bun run export` | Exporta los invitados de Supabase (migración) |

## Despliegue en Vercel

1. Sube el repositorio y deja que Vercel detecte Next.js.
2. En **Storage**, crea un store de Blob y conecta el proyecto. Vercel pone
   `BLOB_READ_WRITE_TOKEN` en el entorno.
3. Añade `ADMIN_SESSION_SECRET` con `openssl rand -hex 32`.
4. Deja `data/usuarios.json` con al menos un usuario (usa `bun run password`
   localmente y sube el archivo).
5. Despliega y entra a `/admin`.

Los archivos de `data/` viajan en el repositorio, así que un usuario sin
contraseña nunca llega a producción. Aun así, conviene revisar que
`data/usuarios.json` no quede expuesto en un repositorio público: contiene el
hash de la contraseña.

## Problemas frecuentes

**El panel responde 307 a `/admin/login` en bucle.** `ADMIN_SESSION_SECRET`
cambió después de emitir la cookie, así que las sesiones viejas dejan de
firmarse. Vuelve a entrar.

**`/admin` dice "Acceso denegado" a un invitado legítimo.** El enlace necesita el
UUID completo, no el prefijo que se pegó en el chat. El UUID tiene 36 caracteres
con guiones.

**Las confirmaciones no persisten en Vercel.** Falta `BLOB_READ_WRITE_TOKEN`; sin
él se escribe en el disco de la función y se pierde. Activa el store de Blob.

**Un invitado aparece con datos de otro.** En `/admin` se puede editar el nombre
de cualquiera; revisa que el enlace enviado sea el UUID correcto.

**`bun run export` responde 401.** Se está usando la clave anon en vez de la de
service role.
