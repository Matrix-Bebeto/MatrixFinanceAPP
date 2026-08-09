export const APP_PATHS = {
  home: "/",
  login: "/login",
  resetPassword: "/reset-password",
} as const

export function buildHashUrl(origin: string, path: string) {
  const normalizedOrigin = origin.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedOrigin}/#${normalizedPath}`
}

export function getAuthRedirectUrls(origin: string) {
  const normalizedOrigin = origin.replace(/\/+$/, "")
  return {
    callback: `${normalizedOrigin}/`,
    home: buildHashUrl(normalizedOrigin, APP_PATHS.home),
  }
}

export function getAuthEventPath(event: string, currentHash: string) {
  if (event === "PASSWORD_RECOVERY") return APP_PATHS.resetPassword
  if (event === "SIGNED_IN" && !currentHash.startsWith("#/")) return APP_PATHS.home
  return null
}
