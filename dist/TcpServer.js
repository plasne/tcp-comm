"use strict";
// TODO: needs to support committing checkpoints to some kind of state
// TODO: need to document stuff better
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const net = require("net");
const split = require("split");
const TcpComponent_1 = require("./TcpComponent");
// define server logic
class TcpServer extends TcpComponent_1.TcpComponent {
    constructor(options) {
        super(options);
        this.clients = [];
        // options or defaults
        this.options = options || {};
        if (options) {
            const local = this.options;
            local.port = TcpComponent_1.TcpComponent.toInt(options.port);
        }
    }
    get port() {
        const local = this.options;
        return local.port || 8000;
    }
    async process(socket, msg) {
        switch (msg.c) {
            case 'checkin':
                let client = this.clients.find(c => c.id === msg.p);
                let isNew = false;
                if (client) {
                    client.lastCheckin = new Date().valueOf();
                    if (!client.socket || client.socket !== socket) {
                        if (client.socket)
                            client.socket.end();
                        client.socket = socket;
                        isNew = true;
                    }
                }
                else {
                    client = {
                        id: msg.p,
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
                break;
        }
        return super.process(socket, msg);
    }
    listen() {
        // ensure errors are being trapped
        if (this.listenerCount('error') < 1) {
            throw new Error('you must attach at least 1 error listener.');
        }
        // start listening for TCP
        net.createServer(socket => {
            // pipe input to a stream and break on messages
            const stream = socket.pipe(split());
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
                    if (client)
                        client.socket = undefined;
                    socket.destroy();
                });
            }
            // look for any disconnects
            socket.on('end', () => {
                const client = this.clients.find(c => c.socket === socket);
                if (client) {
                    this.emit('disconnect', client);
                    client.socket = undefined;
                }
                else {
                    this.emit('disconnect');
                }
            });
        }).listen(this.port, () => {
            this.emit('listen');
        });
    }
    sendToClient(client, msg, options) {
        if (client.socket) {
            return this.sendToSocket(client.socket, msg, options);
        }
        else if (options && options.receipt) {
            throw new Error(`ENOTOPEN: a receipt was requested but the socket is not open.`);
        }
        else {
            return Promise.resolve();
        }
    }
    send(client, payload, options) {
        return this.sendToClient(client, {
            c: 'data',
            p: payload
        }, options);
    }
}
exports.TcpServer = TcpServer;
