# Recurse Roulette

## Server

The server keeps track of peer IDs as they initially connect in a set. The client has access to two endpoints thaat can return that set as JSON object or consume a particular ID to remove it from the set:

`/api/peers`

This returns the list of available peers to connect do.

`/api/peers/consume/:id`

This will remove the specified id from the peer set. The client should only send their own id upon a successful stream/call connection.
