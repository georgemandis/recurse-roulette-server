# Recurse Roulette

Recurse Roulette is an app for Recursers to randomly pair to chat with each other. Try using Recurse Roulette for coffee or lunch chats!

## Overview

Recurse Roulette uses WebRTC through a Javascript library called Peer JS. Recurse Roulette requires users to initially connect to a signaling server to be paired. After they have been paired, they share video and audio streams via a peer to peer connection.

### How the Signaling Server Works

The server keeps track of peer IDs as they initially connect in a set. The client has access to four endpoints:

`/api/peers`

This returns the list of available peers to connect do.

`/api/online`

This returns the total number of peers who are online.

`/api/peers/consume/:id`

This will remove the specified id from the peer set. The client sends their own id upon a successful stream/call connection.

`/api/peers/add/:id`

This will add the specified id to the peer set. The client sends own id when they are ready to be paired again.

### Recurse Authentication

Recurse Roulette requires users to authenticate with Recurse Center before signing in. Check out the [Wiki](https://github.com/recursecenter/wiki/wiki/Recurse-Center-API) for more details. Once Recursers have authenticated, they are remembered through [express sessions](https://www.npmjs.com/package/express-session).

### Tech Stack

- [Peer.js](https://peerjs.com/) - used to make peer to peer connection on the client-side through WebRTC
- Express and Node - used for the signaling server
- JS Classic - used for client-side logic

## Recurse Roulette Team

<table>
  <tr>
    <td align="center"><a href="https://github.com/georgemandis"><img src="https://avatars0.githubusercontent.com/u/21219?s=460&v=4" width="200px;" alt="Picture of George Madis"/><br /><b>George Mandis</b></a></td>
    <td align="center"><a href="https://github.com/samson212"><img src="https://avatars2.githubusercontent.com/u/1728821?s=400&v=4" width="200px;" alt="Picture of Sam Lazarus"/><br /><b>Sam Lazarus</b></a></td>
    <td align="center"><a href="https://github.com/allicolyer"><img src="https://avatars1.githubusercontent.com/u/11083917?s=460&v=4" width="200px;" alt="Picture of Allison Colyer"/><br /><b>Alli Colyer</b></a></td>
    <td align="center"><a href="https://github.com/AsaNeedle"><img src="https://avatars3.githubusercontent.com/u/43149404?s=460&v=4" width="200px;" alt="Picture of Asa Needle"/><br /><b>Asa Needle</b></a></td>
  </tr>
</table>
