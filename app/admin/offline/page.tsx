export default function AdminOfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory p-6 text-ink">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-8 h-12 w-px bg-ink/20" />
        <h1 className="font-serif text-4xl font-light tracking-[-0.01em] text-ink">
          Sin conexión
        </h1>
        <p className="mt-4 font-serif text-sm font-light italic text-ink-soft">
          No pudimos cargar esta sección. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <a
          href="/admin"
          className="mt-10 inline-block border border-ink bg-ink px-8 py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90"
        >
          Volver a intentar
        </a>
        <div className="mt-14 border-t border-ink/10 pt-8">
          <p className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
            Javier &amp; Maria · Panel interno
          </p>
        </div>
      </div>
    </div>
  )
}
