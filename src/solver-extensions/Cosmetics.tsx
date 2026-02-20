import { cellCenter, gridViewBox, overlayStyle } from './svgHelpers'
import { FONT_FAMILY } from '../theme'

interface CosmeticLine {
  // Points as [row, col] — can be fractional for between-cell placement
  points: [number, number][]
  color: string
  width: number
}

interface CosmeticCircle {
  center: [number, number]
  fillColor: string
  outlineColor: string
  radius: number
  value?: string
  fontColor?: string
}

interface CosmeticText {
  position: [number, number]
  value: string
  color: string
  size: number
}

interface CosmeticsData {
  lines: CosmeticLine[]
  circles: CosmeticCircle[]
  texts: CosmeticText[]
}

export default class Cosmetics implements SolverExtension {
  extensionName = 'cosmetics'
  private data: CosmeticsData = { lines: [], circles: [], texts: [] }

  getBoardOverlay = (_board: BoardState, cellSize: number): any => {
    const { lines, circles, texts } = this.data
    if (lines.length === 0 && circles.length === 0 && texts.length === 0)
      return null

    const cc = (r: number, c: number) => cellCenter(r, c, cellSize)

    return (
      <svg
        style={overlayStyle()}
        viewBox={gridViewBox(cellSize, _board.length, _board[0].length)}
      >
        {lines.map((line, i) => {
          const points = line.points
            .map(([r, c]) => {
              const { x, y } = cc(r, c)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polyline
              key={`line-${i}`}
              points={points}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width * cellSize * 0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
        {circles.map((circle, i) => {
          const { x, y } = cc(circle.center[0], circle.center[1])
          const r = circle.radius * cellSize * 0.5
          return (
            <g key={`circle-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={circle.fillColor || 'none'}
                stroke={circle.outlineColor || '#000000'}
                strokeWidth={2}
              />
              {circle.value && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={circle.fontColor || '#000000'}
                  fontSize={r * 1.2}
                  fontFamily={FONT_FAMILY}
                  fontWeight="bold"
                >
                  {circle.value}
                </text>
              )}
            </g>
          )
        })}
        {texts.map((text, i) => {
          const { x, y } = cc(text.position[0], text.position[1])
          return (
            <text
              key={`text-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={text.color}
              fontSize={text.size * cellSize * 0.4}
              fontFamily={FONT_FAMILY}
              fontWeight="bold"
            >
              {text.value}
            </text>
          )
        })}
      </svg>
    )
  }

  loadPuzzleData = (data: CosmeticsData) => {
    this.data = data
  }
}
