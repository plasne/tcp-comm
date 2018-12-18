/// <reference types="node" />
import net = require('net');
import IMessage from './IMessage';
import { ISendOptions, ITcpComponentOptions, TcpComponent } from './TcpComponent';
export interface ITcpClientOptions extends ITcpComponentOptions {
    id?: string;
    metadata?: any;
    address?: string;
    port?: number;
    checkin?: number;
}
export declare interface TcpClient {
    on(event: string, listener: (payload: any, respond?: (response?: any) => void) => void): this;
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'checkin', listener: () => void): this;
    on(event: 'disconnect', listener: () => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: 'data', listener: (payload: any, respond?: (response?: any) => void) => void): this;
    on(event: 'ack', listener: (ack: IMessage, msg: IMessage) => void): this;
    on(event: 'encode', listener: (before: number, after: number) => void): this;
    on(event: 'error', listener: (error: Error, module: string) => void): this;
}
export declare class TcpClient extends TcpComponent {
    private socket?;
    private socketIsOpen;
    constructor(options?: ITcpClientOptions);
    readonly id: string;
    readonly metadata: any;
    readonly address: string;
    readonly port: number;
    readonly checkin: number;
    connect(): void;
    sendCommand(cmd: string, payload: any, options?: ISendOptions): Promise<any>;
    protected process(_: net.Socket, msg: IMessage): Promise<any>;
    protected sendToServer(msg: IMessage, options?: ISendOptions): Promise<any>;
    private checkinToServer;
}
