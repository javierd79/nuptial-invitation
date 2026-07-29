# Invitación Digital de Boda Interactiva 💍

Una invitación de boda digital elegante y exclusiva construida con Next.js, React, TypeScript y Tailwind CSS.

## Características

✨ **Flujo interactivo de 4 fases:**
1. **Validación de Invitado** - Validación segura mediante código de acceso
2. **Pantalla del Sobre** - Sobre cerrado elegante con sello de cera animado
3. **Reproducción de Video** - Video a pantalla completa con transición suave
4. **Contenido de Invitación** - Diseño minimalista y romántico con detalles personalizados

🎵 **Control de Audio Flotante** - Botón FAB para reproducir/pausar música de fondo

📱 **Diseño Responsivo** - Se adapta perfectamente a cualquier dispositivo

## Requisitos Previos

- Node.js 18+ y pnpm
- Una cuenta de Supabase (para autenticación en producción)

## Instalación y Ejecución Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar servidor de desarrollo
pnpm dev

# 3. Abrir en el navegador
# http://localhost:3000/?key=12345
```

## Códigos de Acceso de Prueba

Por defecto, el sistema acepta dos códigos de invitación:

- **key=12345** - Invitado estándar (2 acompañantes)
- **key=wedding2025** - Invitado especial (3 acompañantes)

Cualquier otro código mostrará la pantalla "Acceso Denegado".

## Estructura del Proyecto

```
/components
  ├── WeddingInvitation.tsx    # Componente principal (287 líneas)
/public
  ├── letter.mp4               # Video de la invitación
  ├── letter.png               # Imagen del sobre
/app
  ├── page.tsx                 # Página principal
  ├── layout.tsx               # Layout con metadata
  └── globals.css              # Estilos globales + animaciones
```

## Personalización

### 1. Cambiar Nombres de los Novios

Edita `components/WeddingInvitation.tsx` línea ~180:

```tsx
<h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-2">
  TU NOMBRE
</h1>
```

### 2. Cambiar Datos de la Invitación

En la misma sección, actualiza:

```tsx
// Fecha
<p className="text-gray-600">Sábado, 15 de Noviembre</p>

// Hora
<p className="text-gray-600">Ceremonia: 16:30</p>

// Ubicación
<p className="text-gray-600">Hacienda Bella</p>
```

### 3. Cambiar Video

Reemplaza `/public/letter.mp4` con tu video de invitación. Usa:

```bash
cp tu-video.mp4 public/letter.mp4
```

### 4. Cambiar Imagen del Sobre

Reemplaza `/public/letter.png` con una nueva imagen del sobre.

### 5. Integrar con Supabase Real

Reemplaza la función `validateGuest` con tu lógica real de Supabase:

```tsx
const validateGuest = async () => {
  const params = new URLSearchParams(window.location.search)
  const key = params.get('key')

  // Conectar a Supabase
  const { data, error } = await supabase
    .from('invitados')
    .select('*')
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
}
```

## Música de Fondo

Actualmente, el botón de música está configurado con un audio placeholder. Para agregar música real:

1. Agrega tu archivo de audio a `/public/musica.mp3`
2. Actualiza la referencia en `WeddingInvitation.tsx`:

```tsx
<audio ref={audioRef} loop>
  <source src="/musica.mp3" type="audio/mpeg" />
</audio>
```

## Despliegue

### En Vercel

```bash
# Conecta tu repositorio de GitHub a Vercel
# Vercel detectará automáticamente que es una app Next.js
# Haz push a tu rama y Vercel desplegará automáticamente
```

### Variables de Entorno (si usas Supabase)

En `Vercel Settings > Environment Variables`, añade:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxx
```

## Fases del Flujo

### 1. Validación (validating)
- Muestra un spinner elegante
- Simula la llamada a base de datos (1.5s)
- Si el código es inválido, muestra "Acceso Denegado"

### 2. Sobre (envelope)
- Pantalla a pantalla completa con la imagen del sobre
- Botón con sello de cera animado (pulso suave)
- Al hacer clic, inicia el video

### 3. Video (video)
- Reproducción a pantalla completa del video
- Sin controles visibles
- Al finalizar, transiciona a la invitación

### 4. Invitación (invitation)
- Contenido principal de la invitación
- Secciones: Fecha, Hora, Ubicación, Código de Vestimenta
- Botón FAB para música
- Sección de confirmación de asistencia

## Animaciones

Las animaciones se manejan mediante Tailwind CSS:

- **Pulse** - Sello de cera pulsando suavemente
- **Fade-in** - Desvanecimiento del video a invitación
- **Hover** - Efectos en botones y elementos interactivos

## Accesibilidad

✓ Aria labels en todos los botones  
✓ Headings semánticos  
✓ Contraste de colores adecuado  
✓ Navegación por teclado completa  

## Tecnologías Usadas

- **Next.js 16** - Framework de React
- **React 19** - Librería UI
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Estilos
- **Lucide React** - Iconos
- **shadcn/ui** - Componentes base

## Notas Importantes

1. **Video de Demostración**: El video que se proporciona es un ejemplo. Reemplázalo con tu video real.

2. **Música Placeholder**: Actualmente hay un audio WAV vacío. Agregá tu música real para una experiencia completa.

3. **Supabase Mock**: El sistema de validación está simulado. Intégralo con tu tabla real de `invitados` en Supabase.

4. **Skip Parameter**: Para desarrollo/testing, puedes usar `?skip=invitation` para ir directamente a la fase de invitación sin mostrar el video.

## Posibles Mejoras Futuras

- Estadísticas de confirmación en tiempo real
- Galería de fotos
- Contador regresivo hasta la boda
- Mapa interactivo de la ubicación
- Notificaciones de confirmación por email
- Carrito de regalos integrado
- Página de padrinos/madrinas

## Soporte y Ayuda

Para integrar Supabase correctamente:

1. Crea una tabla `invitados` en Supabase con campos:
   - `id` - UUID
   - `codigo_acceso` - TEXT (unique)
   - `nombre` - TEXT
   - `acompañantes` - INTEGER
   - `confirmado` - BOOLEAN (default: false)

2. Habilita Row Level Security (RLS) para seguridad

3. Reemplaza el mock en `WeddingInvitation.tsx` con llamadas reales a Supabase

## Licencia

Este proyecto es exclusivo para uso en la boda. Contacta con el desarrollador para licencias adicionales.

---

**Construido con 💖 para hacer tu boda digital especial** ✨
