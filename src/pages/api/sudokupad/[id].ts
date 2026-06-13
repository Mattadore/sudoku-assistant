import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Proxy for resolving SudokuPad short puzzle links.
 *
 * SudokuPad short URLs (e.g. https://sudokupad.app/2yqoz2693w) don't carry
 * inline puzzle data — the payload lives on SudokuPad's server and must be
 * looked up by id. Their public lookup endpoint is
 *   https://sudokupad.app/api/puzzle/<id>
 * which returns the raw puzzle payload (an scl…/ctc…/fpuzzles string).
 *
 * We proxy it server-side rather than fetching from the browser so the import
 * works from any deploy origin without depending on SudokuPad's CORS allowlist.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query
  const puzzleId = Array.isArray(id) ? id[0] : id

  if (!puzzleId) {
    res.status(400).json({ error: 'Missing puzzle id' })
    return
  }

  try {
    const upstream = await fetch(
      `https://sudokupad.app/api/puzzle/${encodeURIComponent(puzzleId)}`,
    )

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `SudokuPad lookup failed (HTTP ${upstream.status}) for id "${puzzleId}"`,
      })
      return
    }

    const body = await upstream.text()
    // Cache resolved payloads at the edge — puzzle data for a given id is immutable.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(200).send(body)
  } catch (e: any) {
    res.status(502).json({
      error: e?.message ?? 'Failed to reach SudokuPad',
    })
  }
}
