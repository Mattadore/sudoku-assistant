/**
 * LZW decompressor for the CTC/SudokuPad puzzle format.
 * Ported from sudocle (github.com/michel-kraemer/sudocle).
 * The CTC format uses a modified LZW algorithm with bit-reversed codes.
 */

function reverseBits8(n: number): number {
  n = ((n >> 1) & 0x55) | ((n & 0x55) << 1)
  n = ((n >> 2) & 0x33) | ((n & 0x33) << 2)
  n = ((n >> 4) & 0x0f) | ((n & 0x0f) << 4)
  return n & 0xff
}

function reverseBits16(n: number): number {
  n = ((n >> 1) & 0x5555) | ((n & 0x5555) << 1)
  n = ((n >> 2) & 0x3333) | ((n & 0x3333) << 2)
  n = ((n >> 4) & 0x0f0f) | ((n & 0x0f0f) << 4)
  n = ((n >> 8) & 0x00ff) | ((n & 0x00ff) << 8)
  return n & 0xffff
}

function reverseBits(n: number, width: number): number {
  if (width <= 8) return reverseBits8(n) >>> (8 - width)
  if (width <= 16) return reverseBits16(n) >>> (16 - width)
  return 0
}

class BitInputStream {
  private data: Uint8Array
  private bitPos = 0

  constructor(buffer: Uint8Array) {
    this.data = buffer
  }

  get position(): number {
    return this.bitPos
  }

  get length(): number {
    return this.data.length * 8
  }

  read(n: number): number {
    let result = 0
    for (let i = 0; i < n; i++) {
      const byteIdx = this.bitPos >> 3
      const bitIdx = this.bitPos & 7
      if (byteIdx >= this.data.length) break
      result = (result << 1) | ((this.data[byteIdx] >> (7 - bitIdx)) & 1)
      this.bitPos++
    }
    return result
  }
}

export function lzwDecompress(input: Uint8Array): string | undefined {
  const dictionary: string[] = ['', '']
  let prefixWidth = 2
  let maxDictionarySize = 4
  const result: string[] = []

  function pushDictionary(c: string) {
    dictionary.push(c)
    if (dictionary.length === maxDictionarySize) {
      ++prefixWidth
      maxDictionarySize = Math.pow(2, prefixWidth)
    }
  }

  let w = ''
  const bis = new BitInputStream(input)
  while (bis.position < bis.length - prefixWidth) {
    let i = reverseBits(bis.read(prefixWidth), prefixWidth)

    if (i === 0) {
      pushDictionary(String.fromCharCode(reverseBits8(bis.read(8))))
      i = dictionary.length - 1
    } else if (i === 1) {
      pushDictionary(String.fromCharCode(reverseBits16(bis.read(16))))
      i = dictionary.length - 1
    } else if (i === 2) {
      return result.join('')
    }

    let c: string
    if (i < dictionary.length) {
      c = dictionary[i]
    } else if (i === dictionary.length) {
      c = w + w[0]
    } else {
      return undefined
    }

    result.push(c)
    pushDictionary(w + c[0])
    w = c
  }

  return result.join('')
}

/** Decode a base64 string to Uint8Array (browser + Node.js compatible). */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
