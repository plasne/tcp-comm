// TODO: needs to support committing checkpoints to some kind of state
// TODO: need to document stuff better

// includes
import { EventEmitter } from 'events';
import net = require('net');
import split = require('split');
import IMessage from './IMessage';

export interface ITcpServerOptions {
    port?: number;
    timeout?: number;
}

export interface IClient {
    id: string;
    socket?: net.Socket;
    lastCheckin?: number;
}

function toInt(value: any, dflt: number) {
    if (isNaN(value)) return dflt;
    return parseInt(value, 10);
}

// define server logic
export default class TcpServer extends EventEmitter {
    public options: ITcpServerOptions;
    public clients: IClient[] = [];

    public constructor(options?: ITcpServerOptions) {
        super();

        // options or defaults
        this.options = options || {};
        this.options.port = toInt(this.options.port, 8000);
        this.options.timeout = toInt(this.options.timeout, 30000);

        // if there is a handler, then emit errors, otherwise, throw them
        this.on('error', error => {
            // prevents: https://nodejs.org/api/events.html#events_error_events
            if (this.listenerCount('error') === 1) {
                setTimeout(() => {
                    console.error('got here!!!!');
                    throw error;
                }, 0);
            }
        });
    }

    public listen() {
        // start listening for TCP
        net.createServer(socket => {
            // pipe input to a stream and break on messages
            socket.setEncoding('utf8');
            const stream = socket.pipe(split());

            // handle messages
            stream.on('data', data => {
                try {
                    const str = data.toString('utf8');
                    if (str) {
                        const msg: IMessage = JSON.parse(str);

                        // process the message types
                        switch (msg.cmd) {
                            case 'checkin':
                                let client = this.clients.find(
                                    c => c.id === msg.payload
                                );
                                let isNew = false;
                                if (client) {
                                    client.lastCheckin = new Date().valueOf();
                                    if (
                                        !client.socket ||
                                        client.socket !== socket
                                    ) {
                                        if (client.socket) client.socket.end();
                                        client.socket = socket;
                                        isNew = true;
                                    }
                                } else {
                                    client = {
                                        id: msg.payload,
                                        lastCheckin: new Date().valueOf(),
                                        socket
                                    };
                                    this.clients.push(client);
                                    isNew = true;
                                }
                                if (isNew) {
                                    this.emit('connect', client);
                                }
                                this.emit('checkin', client);
                                this.send(client, {
                                    cmd: 'ack:checkin',
                                    payload: null
                                });
                                break;
                        }
                    }
                } catch (error) {
                    this.emit('error', error, 'data');
                }
            });

            // handle timeouts
            if (this.options.timeout) {
                socket.setTimeout(this.options.timeout);
                socket.on('timeout', () => {
                    const client = this.clients.find(c => c.socket === socket);
                    this.emit('timeout', client);
                    this.emit('disconnect', client);
                    if (client) client.socket = undefined;
                    socket.end();
                });
            }

            // look for any disconnects
            socket.on('end', () => {
                console.log('raised end');
                const client = this.clients.find(c => c.socket === socket);
                if (client) {
                    this.emit('disconnect', client);
                    client.socket = undefined;
                } else {
                    this.emit('disconnect');
                }
            });
        }).listen(this.options.port, () => {
            this.emit('listen');
        });
    }

    public broadcast(msg: IMessage) {
        const promises: Array<Promise<void>> = [];
        for (const client of this.clients) {
            const promise = this.send(client, msg);
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    public send(client: IClient, msg: IMessage) {
        return new Promise<void>((resolve, reject) => {
            try {
                if (client.socket) {
                    const s = JSON.stringify(msg) + '\n';
                    client.socket.write(s, () => {
                        resolve();
                    });
                } else {
                    // if there is no receipt requirement, then who cares if it cannot send
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
