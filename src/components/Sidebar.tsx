import React, { useState } from 'react'
import styled from '@emotion/styled'
import { Divider, Button, Accordion } from 'semantic-ui-react'
import RichTextEditor, { EditorValue } from 'react-rte'
import { CompactPicker } from 'react-color'

const SidebarContainer = styled.div`
  flex: 1;
  max-width: 25rem;
  height: 100%;
  background-color: #ffffff;
`

export default React.memo(
  ({
    // myColor,
    selectorColor,
    onlineId,
    hostId,
    clientIds,
    connections,
  }: {
    // myColor: string
    selectorColor: string
    onlineId: string
    hostId: string
    clientIds: string[]
    connections: { [key: string]: Peer.DataConnection }
  }) => {
    const [editorText, setEditorText] = useState('')
    const [pickingMe, setPickingMe] = useState(false)
    return (
      <SidebarContainer>
        <Divider horizontal>Color</Divider>
        <CompactPicker
          colors={[
            '#FFFFFF',
            '#f3c693',
            '#ff7575',
            '#FE9200',
            '#FCDC00',
            '#f3fb7f',
            '#DBDF00',
            '#8cd2b1',
            '#80EFFF',
            '#2EEFFF',
            '#AEA1FF',
            '#FDA1FF',
            //
            '#B3B3B3',
            '#ffbeb1',
            '#FF492A',
            '#E27300',
            '#FCC400',
            '#B0BC00',
            '#A4DD00',
            '#00FB83',
            '#68CCCA',
            '#6AC7FF',
            '#D579FF',
            '#FA28FF',
            //
            '#000000',
            '#ef9173',
            '#ff0000',
            '#ff4d00',
            '#FB9E00',
            '#68BC00',
            '#00fb1d',
            '#30C18A',
            '#16A5A5',
            '#009CE0',
            '#7B64FF',
            '#AB149E',
          ]}
          color={pickingMe ? myColor : selectorColor}
          onChangeComplete={(color) => {
            // setColor(color.hex)
            if (pickingMe) {
              this.setState({ myColor: color.hex })
              const payload: HostToClientData | ClientToHostData =
                this.state.clientIds.length !== 0
                  ? {
                      type: 'colorMap',
                      colorMap: { [this.state.onlineId]: this.state.myColor },
                    }
                  : { type: 'color', color: this.state.myColor }
              for (let conn in connections) {
                connections[conn].send(payload)
              }
              localStorage.color = color.hex
            } else {
              this.setState({ selectorColor: color.hex })
              this.updateSelected((cell) => {
                cell.color = color.hex
              })
            }
          }}
        />
        <Button
          onClick={(event) => {
            this.setState((state) => ({ pickingMe: !state.pickingMe }))
          }}
          style={{ backgroundColor: myColor }}
        >
          {pickingMe ? 'Picking my color...' : 'Pick my color'}{' '}
        </Button>
        <Divider horizontal>File</Divider>
        <input type="file" id="upload-button" onChange={this.fileInput} />
        <Divider horizontal>Multiplayer</Divider>
        ID: {onlineId} <br />
        <span>
          <input
            // type="text"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                this.initiateClient()
              }
            }}
            onChange={(event) => {
              this.setState({ hostId: event.target.value })
            }}
            value={hostId}
          />
          <span style={{ float: 'right' }}>
            {Object.keys(connections).length !== 0
              ? clientIds.length !== 0
                ? 'HOST'
                : 'CLIENT'
              : 'NOT CONNECTED'}
          </span>
        </span>
        <br />
        {this.currentHost && 'Host is: ' + this.currentHost}
        {clientIds.length !== 0 && 'Clients are: ' + clientIds.join(', ')}
        <Divider horizontal>Notes</Divider>
        <RichTextEditor value={editorText} onChange={this.setEditorText} />
        <Accordion>
          {/* <DragDropContext onDragEnd={() => {}}>
    <Draggable>
      <Droppable>
        <>hi</>
      </Droppable>
      <Droppable>
        <>hello</>
      </Droppable>
    </Draggable>
  </DragDropContext> */}
        </Accordion>
      </SidebarContainer>
    )
  },
)
