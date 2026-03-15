export function hasValidDatabaseUrl(rawValue: string | undefined | null): boolean {
  const value = rawValue?.trim() || ''
  return value.startsWith('postgresql://') || value.startsWith('postgres://')
}
