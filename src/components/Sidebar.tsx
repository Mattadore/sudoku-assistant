// import * as React from 'react'
// import Page from '../pages'
// import {
//   getBoardDiff,
//   getDiff,
//   getDeepDiff,
//   preprocessImage,
//   inplaceMerge,
//   createMerge,
//   stringIndex,
//   splitIndex,
// } from 'helper'
// import {
//   Accordion,
//   TextareaAutosize,
//   Divider,
//   Button,
//   Drawer,
//   Container,
//   Box,
// } from '@mui/material'
// import { CompactPicker } from 'react-color'
// import type { Peer, DataConnection } from 'peerjs'

// const colorPickerColors = [
//   '#FFFFFF',
//   '#f3c693',
//   '#ff7575',
//   '#FE9200',
//   '#FCDC00',
//   '#f3fb7f',
//   '#DBDF00',
//   '#8cd2b1',
//   '#80EFFF',
//   '#2EEFFF',
//   '#AEA1FF',
//   '#FDA1FF',
//   //
//   '#B3B3B3',
//   '#ffbeb1',
//   '#FF492A',
//   '#E27300',
//   '#FCC400',
//   '#B0BC00',
//   '#A4DD00',
//   '#00FB83',
//   '#68CCCA',
//   '#6AC7FF',
//   '#D579FF',
//   '#FA28FF',
//   //
//   '#000000',
//   '#ef9173',
//   '#ff0000',
//   '#ff4d00',
//   '#FB9E00',
//   '#68BC00',
//   '#00fb1d',
//   '#30C18A',
//   '#16A5A5',
//   '#009CE0',
//   '#7B64FF',
//   '#AB149E',
// ]

// export const Sidebar = React.memo(
//   ({
//     pickingMe,
//     myColor,
//     selectedColor,
//     onlineId,
//     hostIdText,
//     clients,
//     host,
//     updateUserdata,
//     initiateClient,
//     setPageState,
//   }: {
//     pickingMe: boolean
//     myColor: string
//     selectedColor: string
//     onlineId: string
//     hostIdText: string
//     clients: Map<string, DataConnection>
//     host: DataConnection | null
//     updateUserdata: (update: Diff<Userdata>) => void
//     initiateClient: () => Promise<void>
//     setPageState: typeof Page
//   }) => (
//     <Drawer
//       sx={{
//         width: 300,
//         flexShrink: 0,
//         // '& .MuiDrawer-paper': {
//         //   width: 300,
//         //   boxSizing: 'border-box',
//         // },
//       }}
//       variant="permanent"
//       anchor="right"
//     >
//       <Divider>Color</Divider>
//       <CompactPicker
//         colors={colorPickerColors}
//         color={pickingMe ? myColor : selectedColor}
//         onChangeComplete={(color) => {
//           // setColor(color.hex)
//           if (pickingMe) {
//             this.setState({ pickingMe: false })
//             this.updateUserdata({ color: color.hex })
//             localStorage.color = color.hex
//           } else {
//             this.setState({ selectedColor: color.hex })
//             this.mutateSelectedCells((cell) => {
//               cell.color = color.hex
//             })
//           }
//         }}
//       />
//       <Button
//         onClick={() => {
//           this.setState((state) => ({ pickingMe: !state.pickingMe }))
//         }}
//         style={{ backgroundColor: myColor }}
//       >
//         {pickingMe ? 'Picking my color...' : 'Pick my color'}{' '}
//       </Button>
//       <Divider>File</Divider>
//       <input type="file" id="upload-button" onChange={this.fileInput} />
//       <Divider>Multiplayer</Divider>
//       ID: {onlineId} <br />
//       <span>
//         <input
//           // type="text"
//           onKeyDown={(event) => {
//             if (event.key === 'Enter') {
//               this.initiateClient()
//             }
//           }}
//           onChange={(event) => {
//             this.setState({ hostIdText: event.target.value })
//           }}
//           value={hostIdText}
//         />
//         <span style={{ float: 'right' }}>
//           {clients.size !== 0
//             ? 'HOST'
//             : host != null
//             ? 'CLIENT'
//             : 'NOT CONNECTED'}
//         </span>
//       </span>
//       <br />
//       {this.state.hostId && 'Host is: ' + this.state.hostId}
//       {clients.size !== 0 &&
//         'Clients are: ' + Array.from(clients, ([name]) => name).join(', ')}
//       <Divider>Notes</Divider>
//       <Accordion>
//         <TextareaAutosize minRows={5} style={{ width: '100%' }} />
//       </Accordion>
//     </Drawer>
//   ),
// )
