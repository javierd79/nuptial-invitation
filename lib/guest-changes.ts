export type GuestChangeKind =
  | 'rsvp'
  | 'arrival'
  | 'checkin-detail'
  | 'participation'
  | 'note'
  | 'chat'

export interface ChangeGuest {
  id: string
  full_name: string
  plus_ones: number
  is_attending?: boolean | null
  checked_in_at?: string | null
  arrival_mode?: string | null
  companions_arrived?: number | null
  attended_ceremony?: boolean
  attended_brindis?: boolean
  protocol_notes?: string | null
}

export interface GuestChangeMessage {
  id: string
  kind: GuestChangeKind
  text: string
}

function arrivalModeText(guest: ChangeGuest): string {
  switch (guest.arrival_mode) {
    case 'alone':
      return 'llegó solo'
    case 'with_companion': {
      const count = guest.companions_arrived ?? 0
      return `llegó con ${count} acompañante${count === 1 ? '' : 's'}`
    }
    case 'companion_only': {
      const count = guest.companions_arrived ?? 0
      return `llegaron solo ${count} acompañante${count === 1 ? '' : 's'}`
    }
    default:
      return 'llegó'
  }
}

export function describeGuestChange(
  prev: ChangeGuest,
  next: ChangeGuest,
): GuestChangeMessage[] {
  const messages: GuestChangeMessage[] = []
  const name = next.full_name

  if (
    next.is_attending !== undefined &&
    prev.is_attending !== undefined &&
    prev.is_attending !== next.is_attending
  ) {
    if (next.is_attending === true) {
      messages.push({ id: `${next.id}:rsvp`, kind: 'rsvp', text: `${name} confirmó asistencia` })
    } else if (next.is_attending === false) {
      messages.push({ id: `${next.id}:rsvp`, kind: 'rsvp', text: `${name} rechazó la invitación` })
    } else {
      messages.push({ id: `${next.id}:rsvp`, kind: 'rsvp', text: `${name} quedó pendiente` })
    }
  }

  if (next.checked_in_at && prev.checked_in_at !== next.checked_in_at) {
    const time = new Date(next.checked_in_at).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    })
    messages.push({
      id: `${next.id}:arrival`,
      kind: 'arrival',
      text: `${name} ${arrivalModeText(next)} · ${time}`,
    })
  } else if (
    next.arrival_mode !== undefined &&
    (prev.arrival_mode !== next.arrival_mode ||
      (prev.companions_arrived ?? 0) !== (next.companions_arrived ?? 0))
  ) {
    messages.push({
      id: `${next.id}:checkin`,
      kind: 'checkin-detail',
      text: `Check-in de ${name}: ${arrivalModeText(next)}`,
    })
  }

  if (
    next.attended_ceremony !== undefined &&
    prev.attended_ceremony !== undefined &&
    prev.attended_ceremony !== next.attended_ceremony
  ) {
    messages.push({
      id: `${next.id}:ceremonia`,
      kind: 'participation',
      text: `${name} ${next.attended_ceremony ? 'asistió a' : 'salió de'} la ceremonia`,
    })
  }

  if (
    next.attended_brindis !== undefined &&
    prev.attended_brindis !== undefined &&
    prev.attended_brindis !== next.attended_brindis
  ) {
    messages.push({
      id: `${next.id}:brindis`,
      kind: 'participation',
      text: `${name} ${next.attended_brindis ? 'asistió al' : 'salió del'} brindis`,
    })
  }

  if (
    next.protocol_notes !== undefined &&
    prev.protocol_notes !== undefined &&
    (prev.protocol_notes ?? '') !== (next.protocol_notes ?? '')
  ) {
    messages.push({
      id: `${next.id}:nota`,
      kind: 'note',
      text: `Nota de protocolo actualizada · ${name}`,
    })
  }

  return messages
}
