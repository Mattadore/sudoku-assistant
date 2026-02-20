import * as React from 'react'
import { decodeFPuzzle, convertFPuzzleToPuzzle } from '../puzzle/import'

export default function DebugPage() {
  const [input, setInput] = React.useState('')
  const [fpuzzleJson, setFpuzzleJson] = React.useState('')
  const [puzzleJson, setPuzzleJson] = React.useState('')
  const [error, setError] = React.useState('')

  const decode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setFpuzzleJson('')
    setPuzzleJson('')
    try {
      const fpuzzle = decodeFPuzzle(input)
      setFpuzzleJson(JSON.stringify(fpuzzle, null, 2))
      const puzzle = convertFPuzzleToPuzzle(fpuzzle)
      setPuzzleJson(JSON.stringify(puzzle, null, 2))
    } catch (e: any) {
      setError(e.message || String(e))
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 16px' }}>Puzzle Debug</h1>
      <form onSubmit={decode} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste FPuzzles URL or encoded string..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 14, fontFamily: 'monospace' }}
        />
        <button type="submit" style={{ padding: '8px 16px', fontSize: 14 }}>
          Decode
        </button>
      </form>
      {error && (
        <pre style={{ color: 'red', padding: 12, background: '#fff0f0', borderRadius: 4 }}>
          {error}
        </pre>
      )}
      {fpuzzleJson && (
        <>
          <h2 style={{ margin: '24px 0 8px' }}>FPuzzle Data (raw decoded)</h2>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 500,
              fontSize: 13,
            }}
          >
            {fpuzzleJson}
          </pre>
        </>
      )}
      {puzzleJson && (
        <>
          <h2 style={{ margin: '24px 0 8px' }}>PuzzleDefinition (converted)</h2>
          <pre
            style={{
              background: '#f0f5ff',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 500,
              fontSize: 13,
            }}
          >
            {puzzleJson}
          </pre>
        </>
      )}
    </main>
  )
}
