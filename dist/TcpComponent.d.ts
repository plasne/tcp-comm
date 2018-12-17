/// <reference types="node" />
import { EventEmitter } from 'events';
import net = require('net');
import IMessage from './IMessage';
export interface ITcpComponentOptions {
    timeout?: number;
}
export interface ISendOptions {
    receipt?: boolean;
    encode?: boolean;
}
export declare abstract class TcpComponent extends EventEmitter {
    protected static toInt(value: any): number | undefined;
    protected options: ITcpComponentOptions;
    private messageId;
    constructor(options?: ITcpComponentOptions);
    readonly timeout: number;
    protected abstract process(socket: net.Socket, msg: IMessage): Promise<any>;
    protected receive(socket: net.Socket, data: any): void;
    protected sendToSocket(socket: net.Socket, msg: IMessage, options?: ISendOptions): Promise<any>;
}
