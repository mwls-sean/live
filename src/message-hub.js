/**
 * @file
 * The single applicaiton-wide message hub that other objects can use to
 * send messages to the connected Flockwave server.
 */

import MessageHub from './flockwave/messages'

import { handleConnectionInformationMessage } from './connections'
import store from './store'

const dispatch = store.dispatch

/**
 * The single application-wide message hub that other objects can use to
 * send messages to the connected Flockwave server.
 *
 * Note that you need to connect the hub to a Socket.IO socket first before
 * using it.
 *
 * @type {MessageHub}
 */
const messageHub = new MessageHub()
messageHub.registerNotificationHandlers({
  'CONN-INF': message =>
    handleConnectionInformationMessage(message.body, dispatch)
})

export default messageHub
