import * as React from 'react'
import type { PageProps } from 'gatsby'
import { compressor } from 'external'

export default ({ path, location }: PageProps) => {
  const [text, setText] = React.useState('')
  const [decoded, setDecoded] = React.useState('')
  const onTextChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value)
  }

  const onEnter = (event: React.FormEvent<HTMLFormElement>) => {
    let decoded = compressor.decompressFromBase64(text)
    console.log(decoded)
    setDecoded(decoded!)
    event.preventDefault()
  }
  return (
    <main>
      <form onSubmit={onEnter}>
        <input onChange={onTextChanged} value={text} />
      </form>
      <div style={{ width: '100%', height: '100%' }}>{decoded}</div>
    </main>
  )
}
