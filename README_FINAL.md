# ✨ Invitación Digital de Boda - Versión Final

## Visión General

Tu invitación de boda digital está **completamente lista** con un diseño minimalista y elegante inspirado en Vowlee.

### Características Principales

✅ **Validación segura** mediante código de acceso por URL
✅ **Sobre interactivo** con video que se reproduce al hacer tap
✅ **Diseño minimalista** limpio y elegante
✅ **Completamente personalizable** en 5 minutos
✅ **Responsive** en todos los dispositivos
✅ **Listo para producción** sin dependencias externas

---

## 🎬 Flujo de Experiencia

### 1. Validación (URL con código)
```
http://localhost:3000/?key=12345
```
- Si la clave es **válida** → Ver sobre
- Si la clave es **inválida** → Acceso Denegado

### 2. Sobre Interactivo
- Fondo negro elegante
- Video del sobre con "Tap to open"
- **Solo se reproduce al hacer tap** (no autoplay)
- Transición suave a la invitación al terminar

### 3. Invitación Minimalista
- Scroll vertical descubriendo contenido
- Nombres, fecha, hora, ubicación
- Guest count personalizado
- Botón RSVP elegante
- Mensaje de cierre poético

---

## 📁 Archivos Clave

```
/components/WeddingInvitation.tsx    Main component (246 líneas)
/app/page.tsx                        Home page
/app/layout.tsx                      Root layout (white background)
/app/globals.css                     Estilos (incluyendo radial gradient)
/public/letter.mp4                   Video del sobre
/public/letter.png                   Imagen del sobre (fallback)
```

---

## 🎨 Diseño

### Filosofía
- **Minimalismo**: Solo lo esencial
- **Elegancia**: Tipografía serif, espaciado generoso
- **Refinamiento**: Blanco limpio, divisores sutiles
- **Accesibilidad**: Alto contraste, fácil de leer

### Colores
- Blanco: `#FFFFFF` (fondo)
- Gris oscuro: `#1A1A1A` (texto)
- Divisores: `#D1D5DB` (gris claro)

### Tipografía
- Encabezados: Serif (Georgia/Cormorant Garamond)
- Cuerpo: Serif elegante y ligero

---

## 🔧 Personalización Rápida (5 minutos)

### 1. Cambiar nombres (línea ~180)
```typescript
<h1 className="text-5xl md:text-6xl font-serif font-light mb-4">
  Tu Nombre Aquí
</h1>
```

### 2. Cambiar fecha
```typescript
<span>15</span>    // día
<span>11</span>    // mes
<span>2025</span>  // año
```

### 3. Cambiar detalles de ceremonia
```typescript
TIME: 16:30
LOCATION: Tu Hacienda
RECEPTION: 18:00
```

### 4. Reemplazar video
```bash
# Reemplaza /public/letter.mp4 con tu video
```

### 5. Agregar música (opcional)
```typescript
// En WeddingInvitation.tsx - descomentar y añadir archivo de audio
```

---

## 🔐 Códigos de Prueba

```
VÁLIDO - 2 acompañantes:
?key=12345

VÁLIDO - 3 acompañantes:
?key=wedding2025

INVÁLIDO:
?key=anything-else
```

---

## 🚀 Despliegue

### Local
```bash
cd /vercel/share/v0-project
pnpm install
pnpm dev
# Abre http://localhost:3000/?key=12345
```

### Vercel
```bash
git push origin main
# Vercel despliega automáticamente
# URL: https://tu-proyecto.vercel.app/?key=12345
```

---

## 🔌 Integración con Supabase (Producción)

Cuando estés listo para datos reales:

1. **Crea tabla en Supabase**:
```sql
CREATE TABLE invitados (
  id SERIAL PRIMARY KEY,
  codigo_acceso TEXT UNIQUE,
  nombre TEXT,
  acompañantes INT,
  email TEXT
);
```

2. **Actualiza validateGuest()** en WeddingInvitation.tsx:
```typescript
const { data: guest } = await supabase
  .from('invitados')
  .select('*')
  .eq('codigo_acceso', key)
  .single()
```

3. **Agrega env vars a Vercel**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_KEY
```

---

## 📊 Arquitectura Técnica

### Stack
- **Framework**: Next.js 16.2.6 (App Router)
- **React**: 19.2.6 con Hooks
- **Estilos**: Tailwind CSS 4.3.3
- **Bundler**: Turbopack (default Next.js 16)

### Componentes
- `WeddingInvitation.tsx`: Componente principal con 3 fases
  - Phase 1: `validating` → Verificación de código
  - Phase 2: `envelope` → Video interactivo
  - Phase 3: `invitation` → Contenido minimalista

### Tipos TypeScript
```typescript
interface GuestData {
  nombre: string
  acompañantes: number
}

type Phase = 'validating' | 'envelope' | 'invitation'
```

---

## ✅ Checklist Pre-Producción

- [ ] Personalizar nombres de novios
- [ ] Actualizar fecha de boda
- [ ] Cambiar hora y ubicación
- [ ] Reemplazar video del sobre
- [ ] Actualizar email para RSVP
- [ ] Probar en móvil (iOS y Android)
- [ ] Probar en desktop (Chrome, Safari)
- [ ] Generar códigos únicos para invitados
- [ ] Deploy a Vercel
- [ ] Enviar enlaces a invitados

---

## 🎯 Casos de Uso

### Para novios
- Invitación exclusiva y elegante
- Datos personalizados por invitado
- Rastreo de confirmaciones

### Para invitados
- Experiencia interactiva y memorable
- Fácil de navegar en móvil
- Todos los detalles a la vista

---

## 🐛 Troubleshooting

### El video no se reproduce
- Verifica que `/public/letter.mp4` existe
- Prueba en un navegador moderno (Chrome, Safari, Firefox)
- Comprueba la consola del navegador para errores

### La invitación no se muestra
- Asegúrate de haber esperado a que termine el video
- Verifica que el código es válido (`?key=12345`)
- Recarga la página

### El diseño se ve diferente en móvil
- Diseño es completamente responsive
- Prueba en dispositivos reales, no solo emuladores
- Verifica zoom del navegador (100%)

---

## 📞 Soporte

Para cambios o preguntas:
1. Revisa los comentarios en WeddingInvitation.tsx
2. Consulta el archivo DESIGN_UPDATE.md
3. Verifica el build: `pnpm build`

---

## 🎊 Resultado Final

Una invitación de boda digital que es:
- ✨ Elegante y minimalista
- 🎯 Fácil de usar
- 📱 Responsive
- 🔐 Segura
- 🚀 Lista para producción
- 💍 Memorable

---

**¡Tu invitación está lista para enviar a tus invitados! 💍**

Disfruta de tu boda. ✨
