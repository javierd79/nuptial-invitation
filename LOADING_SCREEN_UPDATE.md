# Loading Screen - Elegant Update

## Cambios Implementados

La pantalla de carga ha sido completamente rediseñada para coincidir con la estética minimalista y elegante de Vowlee.

### Pantalla de Carga (Validating)

**Características:**
- Fondo blanco limpio (sin gradientes)
- Icono SVG elegante con animación de rotación
- Divisores verticales sutiles
- Mensaje "Please wait" en mayúsculas con espaciado
- Tres puntos animados con delay escalonado
- Tipografía serif elegante

**Animaciones:**
- Rotación suave del icono (3s linear infinite)
- Puntos pulsando con delay diferenciado
- Transición suave al siguiente estado

### Pantalla de Acceso Denegado (Error)

**Características:**
- Diseño simétrico con divisores verticales
- Encabezado "Access Denied" en serif
- Mensaje explicativo claro y elegante
- Sección "Need help?" con información de contacto
- Bordes sutiles entre secciones
- Fondo blanco sin elementos distractores

**Tipografía:**
- Serif font-light para títulos
- Espaciado generoso entre elementos
- Tracking amplificado en labels superiores

## Flujo de la Aplicación

```
┌─────────────────────────────────────┐
│  Sin clave → Access Denied (error)  │
├─────────────────────────────────────┤
│  Clave válida ↓                     │
├─────────────────────────────────────┤
│  Loading Screen (1.5s validating)   │
├─────────────────────────────────────┤
│  Envelope (sobre interactivo)       │
├─────────────────────────────────────┤
│  Video Phase (fullscreen + fade-in) │
├─────────────────────────────────────┤
│  Invitation (fade-in suave)         │
└─────────────────────────────────────┘
```

## Paleta de Colores

- **Fondo:** Blanco limpio (#FFFFFF)
- **Texto principal:** Gris oscuro (#1A1A1A)
- **Texto secundario:** Gris medio (#6B7280)
- **Divisores:** Gris claro (#D1D5DB)
- **Acentos:** Gris muy claro (#E5E7EB)

## Componentes Reutilizados

- SVG personalizado para icono de carga
- Animaciones CSS suave
- Tipografía serif consistente
- Divisores verticales como elemento visual recurrente

## URLs de Prueba

```
http://localhost:3000/                    → Loading + Access Denied
http://localhost:3000/?key=12345          → Loading + Envelope
http://localhost:3000/?key=wedding2025    → Loading + Envelope (3 guests)
http://localhost:3000/?key=invalid        → Loading + Access Denied
```

## Compatibilidad

- Totalmente responsive (mobile, tablet, desktop)
- Funciona en todos los navegadores modernos
- Animaciones optimizadas con CSS
- Sin dependencias adicionales

## Próximos Pasos

La invitación está lista para:
1. Personalizar nombres de invitados
2. Actualizar fechas y ubicación
3. Reemplazar el video en `/public/letter.mp4`
4. Configurar URLs de invitados únicos por medio de base de datos real
5. Desplegar a Vercel
