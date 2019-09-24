// TODO: need to document stuff better

// includes
import net = require('net');
import split = require('split');
import IMessage from './IMessage';
import {
    ISendOptions,
    ITcpComponentOptions,
    TcpComponent
} from './TcpComponent';

export interface ITcpServerOptions extends ITcpComponentOptions {
    port?: number;
}

export interface IClient {
    id: string;
    socket?: net.Socket;
    metadata?: any;
    lastCheckin?: number;
}

/* tslint:disable */
export declare interface TcpServer {
    on(
        event: string,
        listener: (
            client: IClient,
            payload: any,
            respond?: (response?: any) => void
        ) => void
    ): this;
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: (client: IClient) => void): this;
    on(event: 'checkin', listener: (client: IClient) => void): this;
    on(event: 'disconnect', listener: (client?: IClient) => void): this;
    on(event: 'add', listener: (client: IClient) => void): this;
    on(event: 'remove', listener: (client: IClient) => void): this;
    on(event: 'timeout', listener: (client: IClient) => void): this;
    on(
        event: 'data',
        listener: (
            client: IClient,
            payload: any,
            respond?: (response?: any) => void
        ) => void
    ): this;
    on(event: 'ack', listener: (ack: IMessage, msg: IMessage) => void): this;
    on(
        event: 'encode',
        listener: (before: number, after: number) => void
    ): this;
    on(event: 'error', listener: (error: Error, module: string) => void): this;
}
/* tslint:enable */

// define server logic
export class TcpServer extends TcpComponent {
    public clients: IClient[] = [];

    public constructor(options?: ITcpServerOptions) {
        super(options);

        // options or defaults
        this.options = options || {};
        if (options) {
            const local: ITcpServerOptions = this.options;
            local.port = TcpComponent.toInt(local.port);
        }
    }

    public get port() {
        const local: ITcpServerOptions = this.options;
        return local.port || 8000;
    }

    public listen() {
        // ensure errors are being trapped
        if (this.listenerCount('error') < 1) {
            throw new Error('you must attach at least 1 error listener.');
        }

        // start listening for TCP
        net.createServer(socket => {
            // pipe input to a stream and break on messages
            const stream = socket.pipe(split());

            // put errors into the right channel
            socket.on('error', error => {
                this.emit('error', error, 'socket');
                if (error.message.includes('ECONN')) {
                    const client = this.clients.find(c => c.socket === socket);
                    this.emit('disconnect', client);
                    if (client) client.socket = undefined;
                    socket.destroy();
                }
            });

            // handle messages
            stream.on('data', data => {
                this.receive(socket, data);
            });

            // handle timeouts
            if (this.options.timeout) {
                socket.setTimeout(this.options.timeout);
                socket.on('timeout', () => {
                    const client = this.clients.find(c => c.socket === socket);
                    this.emit('timeout', client);
                    this.emit('disconnect', client);
                    if (client) client.socket = undefined;
                    socket.destroy();
                });
            }

            // look for any disconnects
            socket.on('end', () => {
                const client = this.clients.find(c => c.socket === socket);
                if (client) {
                    this.emit('disconnect', client);
                    client.socket = undefined;
                } else {
                    this.emit('disconnect');
                }
            });
        }).listen(this.port, () => {
            this.emit('listen');
        });
    }

    public tell(
        client: IClient,
        cmd?: string,
        payload?: any,
        options?: ISendOptions
    ) {
        if (cmd) {
            const used: string[] = ['data', 'checkin'];
            if (used.includes(cmd)) {
                throw new Error(`command "${cmd}" is a reserved keyword.`);
            }
        } else {
            cmd = 'data';
        }
        return this.sendToClient(
            client,
            {
                c: cmd,
                p: payload
            },
            options
        );
    }

    public ask(
        client: IClient,
        cmd?: string,
        payload?: any,
        options?: ISendOptions
    ) {
        const o = options || {};
        o.receipt = true;
        return this.tell(client, cmd, payload, o);
    }

    public broadcast(cmd?: string, payload?: any, options?: ISendOptions) {
        for (const client of this.clients) {
            this.tell(client, cmd, payload, options).catch(() => {
                // ignore any errors with broadcast, it is best effort
            });
        }
    }

    public add(client: IClient) {
        this.clients.push(client);
        this.emit('add', client);
    }

    public remove(client: IClient) {
        const index = this.clients.indexOf(client);
        if (index > -1) this.clients.splice(index, 1);
        this.emit('remove', client);
    }

    protected async process(socket: net.Socket, msg: IMessage) {
        switch (msg.c) {
            case 'checkin': {
                const payload: IClient = msg.p;
                let client = this.clients.find(c => c.id === payload.id);
                let isNew = false;
                if (client) {
                    client.lastCheckin = new Date().valueOf();
                    if (!client.socket || client.socket !== socket) {
                        if (client.socket) client.socket.end();
                        client.socket = socket;
                        isNew = true;
                    }
                } else {
                    client = {
                        id: payload.id,
                        lastCheckin: new Date().valueOf(),
                        metadata: payload.metadata,
                        socket
                    };
                    this.add(client);
                    isNew = true;
                }
                if (isNew) {
                    this.emit('connect', client);
                }
                this.emit('checkin', client);
                break;
            }
            default: {
                const client = this.clients.find(c => c.socket === socket);
                const eid = msg.c === 'data' ? 'data' : `cmd:${msg.c}`;
                if (this.listenerCount(eid) < 1) {
                    // don't bother to emit
                } else if (msg.i) {
                    return new Promise<any>(resolve => {
                        const respond = (response: any) => {
                            resolve(response);
                        };
                        this.emit(eid, client, msg.p, respond);
                    });
                } else {
                    this.emit(eid, client, msg.p);
                }
                break;
            }
        }
    }

    protected sendToClient(
        client: IClient,
        msg: IMessage,
        options?: ISendOptions
    ) {
        if (client.socket) {
            return this.sendToSocket(client.socket, msg, options);
        } else if (options && options.receipt) {
            throw new Error(
                `ENOTOPEN: a receipt was requested but the socket is not open.`
            );
        } else {
            return Promise.resolve();
        }
    }
}
