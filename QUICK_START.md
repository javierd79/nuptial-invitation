# 🎉 Invitación Digital de Boda - Guía Rápida

## ⚡ Inicio Rápido (5 minutos)

### Localmente

```bash
# 1. Instalar dependencias
pnpm install

# 2. Ejecutar servidor
pnpm dev

# 3. Abrir en navegador
http://localhost:3000/?key=12345
```

### En Vercel

```bash
# 1. Push a GitHub
git push origin main

# 2. Vercel desplegará automáticamente
# Tu invitación estará en vivo en ~30 segundos
```

---

## 🔗 URLs de Prueba

| URL | Resultado |
|-----|-----------|
| `/?key=12345` | ✅ Muestra invitación (2 acompañantes) |
| `/?key=wedding2025` | ✅ Muestra invitación (3 acompañantes) |
| `/?key=invalid` | ❌ Acceso Denegado |
| `/` (sin key) | ❌ Acceso Denegado |

---

## 📝 Personalización Rápida

### 1. **Cambiar Nombres de Novios**

Abre `components/WeddingInvitation.tsx` y busca la línea ~180:

```tsx
// ANTES:
<h1>Javier Andrés Díaz Toyo</h1>
<h1>Maria Zolis González Alcalá</h1>

// DESPUÉS:
<h1>Tu Nombre Aquí</h1>
<h1>Su Nombre Aquí</h1>
```

### 2. **Cambiar Detalles de la Boda**

En la misma sección, actualiza:

```tsx
// Fecha
<p>Sábado, 15 de Noviembre</p>  // ← Cambiar

// Hora
<p>Ceremonia: 16:30</p>  // ← Cambiar

// Ubicación
<p>Hacienda Bella</p>  // ← Cambiar

// Dress Code
<p>Formal</p>  // ← Cambiar
```

### 3. **Cambiar Video**

```bash
# Reemplaza el archivo
cp tu-video.mp4 public/letter.mp4

# El video debe:
# - Estar en formato MP4
# - Reproducirse a pantalla completa
# - Tener una duración de 1-3 minutos (recomendado)
```

### 4. **Cambiar Imagen del Sobre**

```bash
# Reemplaza el archivo
cp tu-imagen.png public/letter.png

# La imagen debe:
# - Ser cuadrada (square aspect ratio)
# - Estar en formato PNG o JPG
# - Tener una resolución de al menos 800x800px
```

### 5. **Cambiar Música de Fondo**

En `components/WeddingInvitation.tsx`, busca la línea ~250:

```tsx
// ACTUAL (placeholder):
<audio ref={audioRef} loop>
  <source src="data:audio/wav;base64,..." type="audio/wav" />
</audio>

// NUEVO (con tu música):
<audio ref={audioRef} loop>
  <source src="/musica.mp3" type="audio/mpeg" />
</audio>
```

Luego sube tu archivo `musica.mp3` a la carpeta `public/`.

---

## 🔐 Integrar con Supabase (Producción)

### Paso 1: Crear Tabla en Supabase

```sql
CREATE TABLE invitados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_acceso TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  acompañantes INTEGER NOT NULL DEFAULT 1,
  confirmado BOOLEAN DEFAULT FALSE,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE invitados ENABLE ROW LEVEL SECURITY;

-- Insertar invitados
INSERT INTO invitados (codigo_acceso, nombre, acompañantes, email) VALUES
('JAVIER-001', 'Juan Pérez', 2, 'juan@example.com'),
('MARIA-001', 'Ana García', 1, 'ana@example.com'),
('VIP-001', 'Carlos López', 3, 'carlos@example.com');
```

### Paso 2: Actualizar Componente

En `components/WeddingInvitation.tsx`, reemplaza `validateGuest`:

```tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const validateGuest = async () => {
  const params = new URLSearchParams(window.location.search)
  const key = params.get('key')

  if (!key) {
    setValidationError(true)
    return
  }

  try {
    const { data, error } = await supabase
      .from('invitados')
      .select('nombre, acompañantes')
      .eq('codigo_acceso', key)
      .single()

    if (error || !data) {
      setValidationError(true)
      return
    }

    setGuestData({
      nombre: data.nombre,
      acompañantes: data.acompañantes,
    })
    setPhase('envelope')
  } catch (error) {
    setValidationError(true)
  }
}
```

### Paso 3: Agregar Variables de Entorno

En Vercel Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxx
```

---

## 🎨 Cambiar Colores

En `app/globals.css`, busca la sección `:root { }`:

```css
:root {
  /* Colores primarios - Cambiar aquí */
  --primary: oklch(0.205 0 0);           /* Negro → Cambiar a color que quieras */
  --accent: oklch(0.97 0 0);             /* Dorado → Cambiar */
  
  /* Más variables disponibles para personalizar */
}
```

---

## 🚀 Desplegar a Vercel

### Opción 1: Git Push (Recomendado)

```bash
git add .
git commit -m "Invitación de boda personalizada"
git push origin main
```

Vercel desplegará automáticamente.

### Opción 2: Vercel CLI

```bash
npm i -g vercel
vercel deploy
```

---

## 🧪 Verificaciones de Calidad

- ✅ Build: `pnpm build`
- ✅ Type Check: `pnpm tsc --noEmit`
- ✅ Lint: `pnpm lint`

---

## 📱 Prueba en Múltiples Dispositivos

```bash
# Responsive Testing
pnpm dev

# Mobile Simulator (DevTools)
F12 → Ctrl+Shift+M (Windows) o Cmd+Shift+M (Mac)

# Prueba estas resoluciones:
# - iPhone (375x667)
# - iPad (768x1024)
# - Desktop (1920x1080)
```

---

## 🎯 Flujo de Uso

```
1. Invitado recibe email con link:
   https://tudominio.com/?key=JAVIER-001

2. Hace clic en el link

3. Sistema valida la clave (2 segundos)

4. Ve el sobre cerrado con sello de cera

5. Hace clic en el sello para abrir

6. Ve el video de presentación

7. Al terminar, ve la invitación completa

8. Puede hacer clic en "Confirmar Asistencia"
```

---

## 🆘 Troubleshooting

### "No funciona en localhost"

```bash
# Verifica que el server esté corriendo
pnpm dev

# Abre http://localhost:3000/?key=12345
```

### "Video no se reproduce"

- Verifica que `public/letter.mp4` existe
- El archivo debe ser un MP4 válido
- Intenta con VLC si no se abre en el navegador

### "Sobre no aparece"

- Verifica que `public/letter.png` existe
- Imagen debe ser cuadrada (square ratio)
- Intenta convertir a PNG si está en JPG

### "Error al integrar Supabase"

- Verifica las credenciales en .env
- Crea la tabla exactamente como se describe
- Comprueba que RLS está habilitado

---

## 📚 Documentación Completa

Para más detalles, consulta:
- `INVITATION_README.md` - Guía detallada
- `IMPLEMENTATION_SUMMARY.md` - Resumen técnico

---

## 🎁 Bonus Tips

### Agregar Confeti al Confirmar

```tsx
// En el click del botón de confirmación
import confetti from 'canvas-confetti'

const handleConfirmClick = () => {
  confetti()
  // ... enviar email
}
```

### Rastrear Confirmaciones

Agrega un endpoint para actualizar la tabla:

```tsx
const confirmAttendance = async () => {
  await supabase
    .from('invitados')
    .update({ confirmado: true })
    .eq('codigo_acceso', invitationKey)
}
```

### Enviar Email de Bienvenida

Integra con SendGrid o Resend para enviar confirmación automática.

---

## ✨ ¡Listo!

Tu invitación digital está lista. Solo personaliza, prueba y ¡envía a tus invitados!

**¿Preguntas?** Consulta la documentación completa o modifica el código según tus necesidades.

---

**🎉 ¡Que disfrutes tu boda digital!** 💍
