/// <reference types="node" />
import net = require('net');
import IMessage from './IMessage';
import { ISendOptions, ITcpComponentOptions, TcpComponent } from './TcpComponent';
export interface ITcpServerOptions extends ITcpComponentOptions {
    port?: number;
}
export interface IClient {
    id: string;
    socket?: net.Socket;
    lastCheckin?: number;
}
export declare interface TcpServer {
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: (client: IClient) => void): this;
    on(event: 'checkin', listener: (client: IClient) => void): this;
    on(event: 'disconnect', listener: (client?: IClient) => void): this;
    on(event: 'remove', listener: (client: IClient) => void): this;
    on(event: 'timeout', listener: (client: IClient) => void): this;
    on(event: 'data', listener: (payload: any, respond?: (response: any) => void) => void): this;
    on(event: 'ack', listener: (msg: IMessage) => void): this;
    on(event: 'encode', listener: (before: number, after: number) => void): this;
    on(event: 'error', listener: (error: Error, module: string) => void): this;
}
export declare class TcpServer extends TcpComponent {
    clients: IClient[];
    constructor(options?: ITcpServerOptions);
    readonly port: number;
    listen(): void;
    send(client: IClient, payload: any, options?: ISendOptions): Promise<any>;
    protected process(socket: net.Socket, msg: IMessage): Promise<any>;
    private sendToClient;
}
