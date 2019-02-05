// includes
import net = require('net');
import split = require('split');
import { v4 as uuid } from 'uuid';
import IMessage from './IMessage';
import {
    ISendOptions,
    ITcpComponentOptions,
    TcpComponent
} from './TcpComponent';

export interface ITcpClientOptions extends ITcpComponentOptions {
    id?: string;
    metadata?: any;
    address?: string;
    port?: number;
    checkin?: number;
}

/* tslint:disable */
export declare interface TcpClient {
    on(
        event: string,
        listener: (payload: any, respond?: (response?: any) => void) => void
    ): this;
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'checkin', listener: (metadata?: any) => void): this;
    on(event: 'disconnect', listener: () => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(
        event: 'data',
        listener: (payload: any, respond?: (response?: any) => void) => void
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
export class TcpClient extends TcpComponent {
    private socket?: net.Socket;
    private socketIsOpen: boolean = false;

    public constructor(options?: ITcpClientOptions) {
        super(options);

        // options or defaults
        this.options = options || {};
        if (options) {
            const local: ITcpClientOptions = this.options;
            local.port = TcpComponent.toInt(local.port);
            local.checkin = TcpComponent.toInt(local.checkin);
        }

        // start the timed checkin process
        //  NOTE: for now, metadata is only sent at connect
        const checkin = async () => {
            await this.checkinToServer();
            setTimeout(() => {
                checkin();
            }, this.checkin);
        };
        checkin();
    }

    public get id() {
        const local: ITcpClientOptions = this.options;
        if (!local.id) local.id = uuid();
        return local.id;
    }

    public get metadata() {
        const local: ITcpClientOptions = this.options;
        return local.metadata;
    }

    public get address() {
        const local: ITcpClientOptions = this.options;
        return local.address || '127.0.0.1';
    }

    public get port() {
        const local: ITcpClientOptions = this.options;
        return local.port || 8000;
    }

    public get checkin() {
        const local: ITcpClientOptions = this.options;
        return local.checkin || 10000;
    }

    public get isConnected() {
        return this.socket && this.socketIsOpen;
    }

    public connect() {
        // ensure errors are being trapped
        if (this.listenerCount('error') < 1) {
            throw new Error('you must attach at least 1 error listener.');
        }

        // use a new socket
        this.socketIsOpen = false;
        this.socket = new net.Socket();

        // handle connection
        this.socket.on('connect', () => {
            if (this.socket) {
                this.socketIsOpen = true;
                this.emit('connect');

                // pipe input to a stream and break on messages
                const stream = this.socket.pipe(split());

                // handle messages
                stream.on('data', data => {
                    if (this.socket) {
                        this.receive(this.socket, data);
                    }
                });

                // checkin immediately on connect
                this.checkinToServer(this.metadata);
            }
        });

        // handle timeouts
        if (this.options.timeout) {
            this.socket.setTimeout(this.options.timeout);
            this.socket.on('timeout', () => {
                this.emit('timeout');
                if (this.socket) this.socket.end();
            });
        }

        // look for any communication errors
        this.socket.on('error', error => {
            if (error.message.includes('ECONN')) {
                setTimeout(() => {
                    connectToServer();
                }, 1000);
            }
            this.emit('error', error, 'socket');
        });

        // look for any disconnects
        this.socket.on('end', () => {
            // dispose of the socket
            this.socketIsOpen = false;
            this.socket = undefined;

            // emit disonnect
            this.emit('disconnect');

            // try a brand new connection after 1 second
            setTimeout(() => {
                this.connect();
            }, 1000);
        });

        // connect to the server immediately
        const connectToServer = () => {
            try {
                if (!this.socket) return;
                this.socket.connect(this.port, this.address);
            } catch (error) {
                this.emit('error', error, 'connect');
                setTimeout(() => {
                    connectToServer();
                }, 1000); // keep trying
            }
        };
        setTimeout(() => {
            connectToServer();
        }, 0);

        return this;
    }

    public tell(cmd?: string, payload?: any, options?: ISendOptions) {
        if (cmd) {
            const used: string[] = ['data', 'checkin'];
            if (used.includes(cmd)) {
                throw new Error(`command "${cmd}" is a reserved keyword.`);
            }
        } else {
            cmd = 'data';
        }
        return this.sendToServer(
            {
                c: cmd || 'data',
                p: payload
            },
            options
        );
    }

    public ask(cmd?: string, payload?: any, options?: ISendOptions) {
        const o = options || {};
        o.receipt = true;
        return this.tell(cmd, payload, o);
    }

    protected async process(_: net.Socket, msg: IMessage) {
        switch (msg.c) {
            default:
                const eid = msg.c === 'data' ? 'data' : `cmd:${msg.c}`;
                if (this.listenerCount(eid) < 1) {
                    // don't bother to emit
                } else if (msg.i) {
                    return new Promise<any>(resolve => {
                        const respond = (response: any) => {
                            resolve(response);
                        };
                        this.emit(eid, msg.p, respond);
                    });
                } else {
                    this.emit(eid, msg.p);
                }
                break;
        }
    }

    protected sendToServer(msg: IMessage, options?: ISendOptions) {
        if (this.socket && this.socketIsOpen) {
            return this.sendToSocket(this.socket, msg, options);
        } else if (options && options.receipt) {
            throw new Error(
                `ENOTOPEN: a receipt was requested but the socket is not open.`
            );
        } else {
            return Promise.resolve();
        }
    }

    private async checkinToServer(metadata?: any) {
        try {
            if (this.socket && this.socketIsOpen) {
                await this.sendToServer(
                    {
                        c: 'checkin',
                        p: {
                            id: this.id,
                            metadata
                        }
                    },
                    {
                        receipt: true
                    }
                );
                this.emit('checkin', metadata);
            }
        } catch (error) {
            this.emit('error', error, 'checkin');
            if (this.socket) this.socket.end();
        }
    }
}
