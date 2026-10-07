export const EXPORT_PAGE_SIZE = 500
export const EXPORT_MAX_ROWS_PER_RESOURCE = 50_000

export async function fetchAllPages(
  fetchPage,
  { pageSize = EXPORT_PAGE_SIZE, maxRows = EXPORT_MAX_ROWS_PER_RESOURCE } = {},
) {
  const rows = []
  for (let from = 0; from < maxRows; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1)
    if (!Array.isArray(page)) throw new Error('Invalid export page')
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
  throw new Error(`Eksport przekracza bezpieczny limit ${maxRows} rekordów.`)
}
