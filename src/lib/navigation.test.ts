import { describe, expect, it } from "vitest"
import { APP_PATHS, buildHashUrl, getAuthEventPath, getAuthRedirectUrls } from "./navigation"

describe("buildHashUrl", () => {
  it("creates a HashRouter-compatible URL", () => {
    expect(buildHashUrl("https://finance.matrixlabs.ia.br", APP_PATHS.login))
      .toBe("https://finance.matrixlabs.ia.br/#/login")
  })

  it("normalizes trailing and missing slashes", () => {
    expect(buildHashUrl("https://example.com/", "reset-password"))
      .toBe("https://example.com/#/reset-password")
  })
})

describe("getAuthRedirectUrls", () => {
  it("returns a root callback so Supabase can process its URL fragment", () => {
    expect(getAuthRedirectUrls("https://finance.matrixlabs.ia.br/").callback)
      .toBe("https://finance.matrixlabs.ia.br/")
  })

  it("returns the authenticated home route", () => {
    expect(getAuthRedirectUrls("https://finance.matrixlabs.ia.br").home)
      .toBe("https://finance.matrixlabs.ia.br/#/")
  })
})

describe("getAuthEventPath", () => {
  it("opens the password form after a recovery callback", () => {
    expect(getAuthEventPath("PASSWORD_RECOVERY", "#access_token=token"))
      .toBe(APP_PATHS.resetPassword)
  })

  it("normalizes an authenticated callback that still contains Supabase tokens", () => {
    expect(getAuthEventPath("SIGNED_IN", "#access_token=token"))
      .toBe(APP_PATHS.home)
  })

  it("keeps an existing application route", () => {
    expect(getAuthEventPath("SIGNED_IN", "#/reports")).toBeNull()
  })
})
