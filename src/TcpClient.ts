// TODO: provide a tunnel to dispatch messages
// TODO: needs to handle reconnects
// TODO: handle buffering messages and things like backpressure

// includes
import { EventEmitter } from 'events';
import net = require('net');
import split = require('split');
import { v4 as uuid } from 'uuid';
import IMessage from './IMessage';

export interface IPartitionerClientOptions {
    id?: string;
    address?: string;
    port?: number;
    timeout?: number;
    checkin?: number;
}

function toInt(value: any, dflt: number) {
    if (isNaN(value)) return dflt;
    return parseInt(value, 10);
}

// define server logic
export default class PartitionerClient extends EventEmitter {
    public options: IPartitionerClientOptions;
    private socket?: net.Socket;
    private socketIsOpen: boolean = false;
    private messageId: number = 0;

    public constructor(options?: IPartitionerClientOptions) {
        super();

        // options or defaults
        this.options = options || {};
        this.options.id = this.options.id || uuid();
        this.options.address = this.options.address || '127.0.0.1';
        this.options.port = toInt(this.options.port, 8000);
        this.options.checkin = toInt(this.options.checkin, 10000);

        // if there is a handler, then emit errors, otherwise, throw them
        this.on('error', error => {
            // prevents: https://nodejs.org/api/events.html#events_error_events
            if (this.listenerCount('error') === 1) {
                setTimeout(() => {
                    throw error;
                }, 0);
            }
        });

        // start the timed checkin process
        const checkin = async () => {
            await this.checkin();
            setTimeout(() => {
                checkin();
            }, this.options.checkin);
        };
        checkin();
    }

    public async checkin() {
        try {
            if (this.socket && this.socketIsOpen) {
                await this.send(
                    {
                        cmd: 'checkin',
                        payload: this.options.id
                    },
                    true
                );
                this.emit('checkin');
            }
        } catch (error) {
            this.emit('error', error, 'checkin');
            if (this.socket) this.socket.end();
        }
    }

    public connect() {
        // use a new socket
        this.socketIsOpen = false;
        this.socket = new net.Socket();

        // handle connection
        this.socket.on('connect', () => {
            if (this.socket) {
                this.socketIsOpen = true;
                this.emit('connect');

                // pipe input to a stream and break on messages
                this.socket.setEncoding('utf8');
                const stream = this.socket.pipe(split());

                // handle messages
                stream.on('data', data => {
                    try {
                        const str = data.toString('utf8');
                        if (str) {
                            const msg: IMessage = JSON.parse(str);
                            if (msg.cmd === 'ack') {
                                this.emit(`ack:${msg.id}`, msg.payload);
                            }
                        }
                    } catch (error) {
                        this.emit('error', error, 'data');
                    }
                });

                // checkin immediately on connect
                this.checkin();
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
                if (!this.options.port) return;
                if (!this.options.address) return;
                if (!this.socket) return;
                this.socket.connect(
                    this.options.port,
                    this.options.address
                );
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
    }

    public send(msg: IMessage, receipt: boolean = false) {
        return new Promise<any>((resolve, reject) => {
            try {
                if (this.socket && this.socketIsOpen) {
                    if (receipt) {
                        this.messageId++;
                        msg.id = this.messageId;
                    }
                    const str = JSON.stringify(msg) + '\n';
                    this.socket.write(str, () => {
                        if (receipt) {
                            // if a receipt was requested, wait for it
                            const to = setTimeout(() => {
                                reject(
                                    new Error(
                                        `ETIMEOUT: failed to get receipt before timeout.`
                                    )
                                );
                            }, this.options.timeout);
                            this.once(`ack:${this.messageId}`, payload => {
                                clearTimeout(to);
                                resolve(payload);
                            });
                        } else {
                            // if no receipt was requested the send is done
                            resolve();
                        }
                    });
                } else if (receipt) {
                    reject(
                        new Error(
                            `ENOTOPEN: a receipt was requested but the socket is not open.`
                        )
                    );
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
