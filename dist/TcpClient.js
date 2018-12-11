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
        this.socketIsOpen = false;
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
        // start the timed checkin process
        setInterval(() => {
            this.checkin();
        }, this.options.checkin);
    }
    checkin() {
        try {
            if (this.socket && this.socketIsOpen) {
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
    }
    connect() {
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
                            const msg = JSON.parse(str);
                            this.emit('message', msg);
                            this.emit('data', msg.payload);
                        }
                    }
                    catch (error) {
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
                if (this.socket)
                    this.socket.end();
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
                if (!this.options.port)
                    return;
                if (!this.options.address)
                    return;
                if (!this.socket)
                    return;
                this.socket.connect(this.options.port, this.options.address);
            }
            catch (error) {
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
    send(msg) {
        return new Promise((resolve, reject) => {
            try {
                if (this.socket && this.socketIsOpen) {
                    const s = JSON.stringify(msg) + '\n';
                    this.socket.write(s, () => {
                        resolve();
                    });
                }
                else {
                    // if there is no receipt requirement, then who cares if it cannot send
                    resolve();
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.default = PartitionerClient;
