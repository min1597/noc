import { Logger } from '@nestjs/common'
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import * as WebSocket from 'ws'

export const clients: Array<{ client: WebSocket }> = new Array()

@WebSocketGateway({
    cors: { origin: '*' }
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor() {  }
    
    @WebSocketServer() server: WebSocket.Server
    private logger: Logger = new Logger('WebsocketGateway')

    afterInit(_server: WebSocket.Server) {
        this.logger.log('WebSocket Server initlizated.')
    }

    handleDisconnect(_client: WebSocket, ... _args: any[]) {
        clients.splice(clients.indexOf(clients.find(__client => __client.client == _client)), 1)
    }

    handleConnection(_client: WebSocket, ... _args: any[]) {
        clients.push({ client: _client })

        _client.send(JSON.stringify({ success: true, data: {  }, error: null }))
        _client.onmessage = (_message: WebSocket.MessageEvent) => {
            let _data: object
            try {
                _data = JSON.parse(_message.data.toString())
            } catch(_error) { return _client.send(JSON.stringify({ success: false, data: null, error: 'Failed to parse message.' })) }
        }
    }
}