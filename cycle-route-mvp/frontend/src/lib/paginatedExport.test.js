import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from './paginatedExport'

describe('paginated account export', () => {
  it('collects every page and stops after the short page', async () => {
    const fetchPage = vi.fn(async (from) =>
      from === 0 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }],
    )
    await expect(fetchAllPages(fetchPage, { pageSize: 2, maxRows: 10 }))
      .resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 1)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 3)
  })

  it('fails explicitly instead of silently truncating at the safety limit', async () => {
    await expect(fetchAllPages(async () => [{}, {}], { pageSize: 2, maxRows: 4 }))
      .rejects.toThrow('bezpieczny limit 4')
  })
})
