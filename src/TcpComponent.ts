// includes
import { EventEmitter } from 'events';
import * as lzutf8 from 'lzutf8';
import net = require('net');
import IMessage from './IMessage';

export interface ITcpComponentOptions {
    timeout?: number;
}

export interface ISendOptions {
    receipt?: boolean;
    encode?: boolean;
}

export abstract class TcpComponent extends EventEmitter {
    protected static toInt(value: any) {
        if (isNaN(value)) return undefined;
        return parseInt(value, 10);
    }

    protected options: ITcpComponentOptions;
    private messageId: number = 0;

    public constructor(options?: ITcpComponentOptions) {
        super();

        // options or defaults
        this.options = options || {};
        this.options.timeout = TcpComponent.toInt(this.options.timeout);
    }

    public get timeout() {
        return this.options.timeout || 30000;
    }

    protected async process(_: net.Socket, msg: IMessage) {
        switch (msg.c) {
            case 'data':
                if (this.listenerCount('data') < 1) {
                    this.emit('data', msg.p);
                } else if (msg.i) {
                    return new Promise<any>(resolve => {
                        const respond = (response: any) => {
                            resolve(response);
                        };
                        this.emit('data', msg.p, respond);
                    });
                } else {
                    this.emit('data', msg.p);
                }
                break;
        }
    }

    protected receive(socket: net.Socket, data: any) {
        try {
            if (data) {
                const str = data.toString('utf8');
                const msg: IMessage = JSON.parse(str);

                // handle the received message
                const receive = async (rmsg: IMessage) => {
                    // emit ack or process as appropriate
                    switch (rmsg.c) {
                        case 'ack':
                            this.emit(`ack:${rmsg.i}`, rmsg.p);
                            break;
                        default:
                            const response = await this.process(socket, rmsg);
                            if (rmsg.i) {
                                // send a receipt if requested
                                const ack = {
                                    c: 'ack',
                                    i: rmsg.i,
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
                    lzutf8.decompressAsync(
                        msg.p,
                        {
                            inputEncoding: 'Base64',
                            outputEncoding: 'String'
                        },
                        (result, error) => {
                            if (!error) {
                                if (msg.e === 1) {
                                    msg.p = JSON.parse(result);
                                } else {
                                    msg.p = result;
                                }
                                receive(msg);
                            } else {
                                this.emit('error', error, 'decode');
                            }
                        }
                    );
                } else {
                    receive(msg);
                }
            }
        } catch (error) {
            this.emit('error', error, 'data');
        }
    }

    protected sendToSocket(
        socket: net.Socket,
        msg: IMessage,
        options?: ISendOptions
    ) {
        return new Promise<any>((resolve, reject) => {
            try {
                // dispatch to the server
                const dispatch = (dmsg: IMessage) => {
                    if (options && options.receipt) {
                        this.messageId++;
                        dmsg.i = this.messageId;
                    }
                    const str = JSON.stringify(dmsg) + '\n';
                    socket.write(str, () => {
                        if (options && options.receipt) {
                            // if a receipt was requested, wait for it
                            const to = setTimeout(() => {
                                reject(
                                    new Error(
                                        `ETIMEOUT: failed to get receipt before timeout.`
                                    )
                                );
                            }, this.timeout);
                            this.once(`ack:${dmsg.i}`, payload => {
                                clearTimeout(to);
                                resolve(payload);
                            });
                        } else {
                            // if no receipt was requested the send is done
                            resolve();
                        }
                    });
                };

                // encode as appropriate
                if (
                    options &&
                    options.encode &&
                    (typeof msg.p === 'string' || typeof msg.p === 'object')
                ) {
                    let payload: string;
                    let before: number;
                    if (typeof msg.p === 'string') {
                        payload = msg.p;
                        before = msg.p.length;
                        msg.e = 2; // string
                    } else {
                        payload = JSON.stringify(msg.p);
                        before = payload.length;
                        msg.e = 1; // object
                    }
                    lzutf8.compressAsync(
                        payload,
                        {
                            inputEncoding: 'String',
                            outputEncoding: 'Base64'
                        },
                        (result, error) => {
                            if (!error) {
                                msg.p = result.toString();
                                const after = msg.p.length;
                                this.emit('encode', before, after);
                            } else {
                                msg.e = 0;
                            }
                            dispatch(msg);
                        }
                    );
                } else {
                    msg.e = 0;
                    dispatch(msg);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
