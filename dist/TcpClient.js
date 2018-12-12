"use strict";
// TODO: provide a tunnel to dispatch messages
// TODO: needs to handle reconnects
// TODO: handle buffering messages and things like backpressure
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const net = require("net");
const split = require("split");
const uuid_1 = require("uuid");
const TcpComponent_1 = require("./TcpComponent");
// define server logic
class TcpClient extends TcpComponent_1.TcpComponent {
    constructor(options) {
        super(options);
        this.socketIsOpen = false;
        // options or defaults
        this.options = options || {};
        if (options) {
            const local = this.options;
            local.port = TcpComponent_1.TcpComponent.toInt(options.port);
            local.checkin = TcpComponent_1.TcpComponent.toInt(options.checkin);
        }
        // start the timed checkin process
        const checkin = async () => {
            await this.checkinToServer();
            setTimeout(() => {
                checkin();
            }, this.checkin);
        };
        checkin();
    }
    get id() {
        const local = this.options;
        if (!local.id)
            local.id = uuid_1.v4();
        return local.id;
    }
    get address() {
        const local = this.options;
        return local.address || '127.0.0.1';
    }
    get port() {
        const local = this.options;
        return local.port || 8000;
    }
    get checkin() {
        const local = this.options;
        return local.checkin || 10000;
    }
    async checkinToServer() {
        try {
            if (this.socket && this.socketIsOpen) {
                await this.sendToServer({
                    c: 'checkin',
                    p: this.id
                }, {
                    receipt: true
                });
                this.emit('checkin');
            }
        }
        catch (error) {
            this.emit('error', error, 'checkin');
            if (this.socket)
                this.socket.end();
        }
    }
    async process(socket, msg) {
        return super.process(socket, msg);
    }
    connect() {
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
                this.checkinToServer();
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
                if (!this.socket)
                    return;
                this.socket.connect(this.port, this.address);
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
    sendToServer(msg, options) {
        if (this.socket && this.socketIsOpen) {
            return this.sendToSocket(this.socket, msg, options);
        }
        else if (options && options.receipt) {
            throw new Error(`ENOTOPEN: a receipt was requested but the socket is not open.`);
        }
        else {
            return Promise.resolve();
        }
    }
}
exports.TcpClient = TcpClient;
