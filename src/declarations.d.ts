declare const graphql: (query: TemplateStringsArray) => void

interface CellData {
  number: number | null
  center: Array<number>
  corner: Array<number>
  color: string | null
}
