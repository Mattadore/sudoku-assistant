import * as React from 'react'
import Page from '.'

interface PageState {}

// class Page extends React.Component<{}, PageState> {

// }

const GoosePage: React.FC<PageState> = (props) => {
  console.log('i am gose')
  return (
    <div>
      <div>
        <div>wah</div>
      </div>
    </div>
  )
}

export default GoosePage
