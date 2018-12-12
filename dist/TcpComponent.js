"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const events_1 = require("events");
const lzutf8 = __importStar(require("lzutf8"));
class TcpComponent extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.messageId = 0;
        // options or defaults
        this.options = options || {};
        this.options.timeout = TcpComponent.toInt(this.options.timeout);
    }
    get timeout() {
        return this.options.timeout || 30000;
    }
    static toInt(value) {
        if (isNaN(value))
            return undefined;
        return parseInt(value, 10);
    }
    async process(_, msg) {
        switch (msg.c) {
            case 'data':
                if (this.listenerCount('data') < 1) {
                    this.emit('data', msg.p);
                }
                else if (msg.i) {
                    return new Promise(resolve => {
                        const respond = (response) => {
                            resolve(response);
                        };
                        this.emit('data', msg.p, respond);
                    });
                }
                else {
                    this.emit('data', msg.p);
                }
                break;
        }
    }
    receive(socket, data) {
        try {
            if (data) {
                const str = data.toString('utf8');
                const msg = JSON.parse(str);
                // handle the received message
                const receive = async (msg) => {
                    // emit ack or process as appropriate
                    switch (msg.c) {
                        case 'ack':
                            this.emit(`ack:${msg.i}`, msg.p);
                            break;
                        default:
                            const response = await this.process(socket, msg);
                            if (msg.i) {
                                // send a receipt if requested
                                const ack = {
                                    c: 'ack',
                                    i: msg.i,
                                    p: response
                                };
                                this.sendToSocket(socket, ack);
                                this.emit('ack', ack);
                            }
                            break;
                    }
                };
                // decode if needed
                if (msg.e) {
                    lzutf8.decompressAsync(msg.p, {
                        inputEncoding: 'Base64',
                        outputEncoding: 'String'
                    }, (result, error) => {
                        if (!error) {
                            if (msg.e === 1) {
                                msg.p = JSON.parse(result);
                            }
                            else {
                                msg.p = result;
                            }
                            receive(msg);
                        }
                        else {
                            this.emit('error', error, 'decode');
                        }
                    });
                }
                else {
                    receive(msg);
                }
            }
        }
        catch (error) {
            this.emit('error', error, 'data');
        }
    }
    sendToSocket(socket, msg, options) {
        return new Promise((resolve, reject) => {
            try {
                // dispatch to the server
                const dispatch = (msg) => {
                    if (options && options.receipt) {
                        this.messageId++;
                        msg.i = this.messageId;
                    }
                    const str = JSON.stringify(msg) + '\n';
                    socket.write(str, () => {
                        if (options && options.receipt) {
                            // if a receipt was requested, wait for it
                            const to = setTimeout(() => {
                                reject(new Error(`ETIMEOUT: failed to get receipt before timeout.`));
                            }, this.timeout);
                            this.once(`ack:${msg.i}`, payload => {
                                clearTimeout(to);
                                resolve(payload);
                            });
                        }
                        else {
                            // if no receipt was requested the send is done
                            resolve();
                        }
                    });
                };
                // encode as appropriate
                if (options &&
                    options.encode &&
                    (typeof msg.p === 'string' || typeof msg.p === 'object')) {
                    let payload;
                    let before;
                    if (typeof msg.p === 'string') {
                        payload = msg.p;
                        before = msg.p.length;
                        msg.e = 2; // string
                    }
                    else {
                        payload = JSON.stringify(msg.p);
                        before = payload.length;
                        msg.e = 1; // object
                    }
                    lzutf8.compressAsync(payload, {
                        inputEncoding: 'String',
                        outputEncoding: 'Base64'
                    }, (result, error) => {
                        if (!error) {
                            msg.p = result.toString();
                            const after = msg.p.length;
                            this.emit('encode', before, after);
                        }
                        else {
                            msg.e = 0;
                        }
                        dispatch(msg);
                    });
                }
                else {
                    msg.e = 0;
                    dispatch(msg);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.TcpComponent = TcpComponent;
