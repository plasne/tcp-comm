/// <reference types="node" />
import net = require('net');
import IMessage from './IMessage';
import { TcpComponent, ITcpComponentOptions } from './TcpComponent';
export interface ITcpClientOptions extends ITcpComponentOptions {
    id?: string;
    address?: string;
    port?: number;
    checkin?: number;
}
export declare interface TcpClient {
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'checkin', listener: () => void): this;
    on(event: 'disconnect', listener: () => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: 'data', listener: (payload: any, respond?: (response: any) => void) => void): this;
    on(event: 'ack', listener: (msg: IMessage) => void): this;
    on(event: 'encode', listener: (before: number, after: number) => void): this;
    on(event: 'error', listener: (error: Error, module: string) => void): this;
}
export declare class TcpClient extends TcpComponent {
    private socket?;
    private socketIsOpen;
    constructor(options?: ITcpClientOptions);
    readonly id: string;
    readonly address: string;
    readonly port: number;
    readonly checkin: number;
    private checkinToServer;
    protected process(socket: net.Socket, msg: IMessage): Promise<any>;
    connect(): void;
    private sendToServer;
}