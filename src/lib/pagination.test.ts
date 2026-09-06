import { expect, it } from "vitest"
import { collectPages } from "./pagination"

it("loads beyond the first 1000 records with inclusive ranges", async () => {
  const records = Array.from({ length: 1215 }, (_, i) => i)
  const result = await collectPages(async (from, to) => ({ data: records.slice(from, to + 1), error: null }))
  expect(result).toEqual(records)
})
it("rejects partial totals when a later page fails", async () => {
  await expect(collectPages(async from => from === 0 ? { data: [1, 2], error: null } : { data: null, error: new Error("offline") }, 2)).rejects.toThrow("offline")
})
