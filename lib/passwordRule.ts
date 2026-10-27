// The same rule the API applies, so a form never accepts something the server
// will then refuse. Mirrors the public site's copy and the backend's
// utils/password.js.
export function passwordProblem(password: string): string | null {
  if (!password) return 'Please choose a password.'
  if (password.length < 8) return 'Your password must be at least 8 characters.'
  // bcrypt reads the first 72 bytes and ignores the rest, so a longer one is
  // turned away rather than quietly cut short.
  if (new TextEncoder().encode(password).length > 72) {
    return 'That password is too long. Please use a shorter one.'
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Your password needs at least one letter and one number.'
  }
  if (/^(.)\1*$/.test(password.replace(/[^A-Za-z]/g, '')) && password.length < 12) {
    return 'Please choose something harder to guess.'
  }
  return null
}
