export function formatVzAmount(raw: string): string {
  const [intPart, ...decParts] = raw.split(',')
  const intDigits = (intPart ?? '').replace(/\D/g, '')
  const formattedInt = intDigits ? intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
  if (decParts.length === 0) return formattedInt
  const decimals = decParts.join('').replace(/\D/g, '').slice(0, 2)
  return decimals ? `${formattedInt},${decimals}` : `${formattedInt},`
}

export function parseVzAmount(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
}

export function formatUsd(value: number): string {
  return `$ ${formatVzAmount(String(value))}`
}

export function formatBs(value: number): string {
  return `Bs. ${formatVzAmount(String(value))}`
}

export function formatUsdt(value: number): string {
  return `${formatVzAmount(String(value))} USDT`
}

export function formatPhone(e164: string): string {
  const match = /^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/.exec(e164)
  if (!match) return e164
  return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`
}
