export function getPublicGuestbookEmail(entry: {
  email: string | null
  emailVisible: boolean
}) {
  return entry.emailVisible ? entry.email : null
}
