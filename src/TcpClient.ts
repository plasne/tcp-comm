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
    checkin?: number;
}

function toInt(value: any, dflt: number) {
    if (isNaN(value)) return dflt;
    return parseInt(value, 10);
}

// define server logic
export default class PartitionerClient extends EventEmitter {
    public options: IPartitionerClientOptions;
    private socket: net.Socket = new net.Socket();
    private socketIsConnected: boolean = false;

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
    }

    public connect() {
        // continually try and connect to server
        const connectToServer = () => {
            try {
                if (!this.options.port) return;
                if (!this.options.address) return;
                this.socket.connect(
                    this.options.port,
                    this.options.address
                );
            } catch (error) {
                this.emit('error', error, 'connect');
                setTimeout(connectToServer, 1000); // keep trying
            }
        };
        setTimeout(connectToServer, 0);

        // handle connection
        this.socket.on('connect', () => {
            this.socketIsConnected = true;
            this.emit('connect');

            // set encoding
            this.socket.setEncoding('utf8');

            // pipe input to a stream and break on messages
            const stream = this.socket.pipe(split());

            // handle messages
            stream.on('data', data => {
                try {
                    const str = data.toString('utf8');
                    if (str) {
                        const msg: IMessage = JSON.parse(str);
                        this.emit('message', msg);
                        this.emit('data', msg.payload);
                    }
                } catch (error) {
                    this.emit('error', error, 'data');
                }
            });

            // checkin every 10 sec
            const checkin = () => {
                try {
                    if (this.socketIsConnected) {
                        this.send({
                            cmd: 'checkin',
                            payload: this.options.id
                        });
                        this.emit('checkin');
                    }
                } catch (error) {
                    this.emit('error', error, 'checkin');
                }
                setTimeout(checkin, this.options.checkin);
            };
            setTimeout(checkin, 0);
        });

        // look for any communication errors
        this.socket.on('error', error => {
            if (error.message.includes('ECONN')) {
                setTimeout(this.connect, 1000);
            }
            this.emit('error', error, 'socket');
        });

        // look for any disconnects
        this.socket.on('end', () => {
            this.socketIsConnected = false;
            this.emit('disconnect');
        });
    }

    public send(msg: IMessage) {
        return new Promise<void>((resolve, reject) => {
            try {
                if (this.socketIsConnected) {
                    const s = JSON.stringify(msg) + '\n';
                    this.socket.write(s, () => {
                        resolve();
                    });
                } else {
                    reject(new Error('server is not connected.'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
