"use strict";
// TODO: provide a tunnel to dispatch messages
// TODO: needs to handle reconnects
// TODO: handle buffering messages and things like backpressure
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const events_1 = require("events");
const net = require("net");
const split = require("split");
const uuid_1 = require("uuid");
function toInt(value, dflt) {
    if (isNaN(value))
        return dflt;
    return parseInt(value, 10);
}
// define server logic
class PartitionerClient extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.socket = new net.Socket();
        this.socketIsConnected = false;
        // options or defaults
        this.options = options || {};
        this.options.id = this.options.id || uuid_1.v4();
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
    connect() {
        // continually try and connect to server
        const connectToServer = () => {
            try {
                if (!this.options.port)
                    return;
                if (!this.options.address)
                    return;
                this.socket.connect(this.options.port, this.options.address);
            }
            catch (error) {
                this.emit('error', error, 'connect');
                setTimeout(connectToServer, 1000); // keep trying
            }
        };
        setTimeout(connectToServer, 0);
        // handle connection
        this.socket.on('connect', () => {
            this.socketIsConnected = true;
            this.emit('connect');
            // pipe input to a stream and break on messages
            this.socket.setEncoding('utf8');
            const stream = this.socket.pipe(split());
            // handle messages
            stream.on('data', data => {
                try {
                    const str = data.toString('utf8');
                    if (str) {
                        const msg = JSON.parse(str);
                        this.emit('message', msg);
                        this.emit('data', msg.payload);
                    }
                }
                catch (error) {
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
                }
                catch (error) {
                    this.emit('error', error, 'checkin');
                }
                setTimeout(checkin, this.options.checkin);
            };
            setTimeout(checkin, 0);
        });
        // function to reconnect
        const reconnect = () => {
            this.socketIsConnected = false;
            this.emit('disconnect');
            setTimeout(this.connect, 1000); // start trying to reconnect
        };
        // handle timeouts
        if (this.options.timeout) {
            this.socket.setTimeout(this.options.timeout);
            this.socket.on('timeout', () => {
                this.emit('timeout');
                reconnect();
            });
        }
        // look for any communication errors
        this.socket.on('error', error => {
            if (error.message.includes('ECONN')) {
                setTimeout(this.connect, 1000);
            }
            this.emit('error', error, 'socket');
        });
        // look for any disconnects
        this.socket.on('end', () => {
            reconnect();
        });
    }
    send(msg) {
        return new Promise((resolve, reject) => {
            try {
                if (this.socketIsConnected) {
                    const s = JSON.stringify(msg) + '\n';
                    this.socket.write(s, () => {
                        resolve();
                    });
                }
                else {
                    reject(new Error('server is not connected.'));
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.default = PartitionerClient;
