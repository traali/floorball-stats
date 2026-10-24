/** "#55 Simo Oinonen" when TASO sent a shirt number, else just the name. */
export function withShirt(name: string, shirt?: string | number | null): string {
  const s = shirt == null ? '' : String(shirt).trim()
  return s && s !== '0' ? `#${s} ${name}` : name
}
