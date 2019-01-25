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
    on(event: string, listener: (client: IClient, payload: any, respond?: (response?: any) => void) => void): this;
    on(event: 'listen', listener: () => void): this;
    on(event: 'connect', listener: (client: IClient, metadata: any) => void): this;
    on(event: 'checkin', listener: (client: IClient, metadata: any) => void): this;
    on(event: 'disconnect', listener: (client?: IClient) => void): this;
    on(event: 'add', listener: (client: IClient) => void): this;
    on(event: 'remove', listener: (client: IClient) => void): this;
    on(event: 'timeout', listener: (client: IClient) => void): this;
    on(event: 'data', listener: (client: IClient, payload: any, respond?: (response?: any) => void) => void): this;
    on(event: 'ack', listener: (ack: IMessage, msg: IMessage) => void): this;
    on(event: 'encode', listener: (before: number, after: number) => void): this;
    on(event: 'error', listener: (error: Error, module: string) => void): this;
}
export declare class TcpServer extends TcpComponent {
    clients: IClient[];
    constructor(options?: ITcpServerOptions);
    readonly port: number;
    listen(): void;
    tell(client: IClient, cmd?: string, payload?: any, options?: ISendOptions): Promise<any>;
    ask(client: IClient, cmd?: string, payload?: any, options?: ISendOptions): Promise<any>;
    add(client: IClient): void;
    remove(client: IClient): void;
    protected process(socket: net.Socket, msg: IMessage): Promise<any>;
    protected sendToClient(client: IClient, msg: IMessage, options?: ISendOptions): Promise<any>;
}
