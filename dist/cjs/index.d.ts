/// <reference types="node" />
import { EventEmitter } from "events";
export interface ABIRPCRequest<T = any> {
    type?: 'request';
    id?: string;
    name: string;
    data: T;
    timeout?: number;
}
export interface ABIRPCResponse<T = any> {
    type?: 'response';
    id?: string;
    name: string;
    data: T;
    code: number;
    message: string;
}
export declare type WebSocketData<T = any> = ABIRPCRequest<T> | ABIRPCResponse<T>;
declare type KeyOfType<T, F> = {
    [K in keyof T]: T[K] extends F ? K : never;
}[keyof T];
export declare class ABIRPCError extends Error {
}
export interface ABIRPCOption {
    timeout?: number;
}
export declare class ABIRPC<T extends Record<string, any>> extends EventEmitter {
    send: <T>(data: WebSocketData<T>, err: (error: Error) => void) => void;
    handler: Record<string, any>;
    option?: ABIRPCOption;
    private timeout;
    constructor(send: <T>(data: WebSocketData<T>, err: (error: Error) => void) => void, handler: Record<string, any>, option?: ABIRPCOption);
    call<K extends KeyOfType<T, Function>>(name: K, ...data: Parameters<T[K]>): Promise<ReturnType<T[K]>>;
    handle(request: WebSocketData): Promise<void>;
    on(event: "error", listener: (this: ABIRPC<T>, error: Error) => void): this;
    on(id: string, listener: (this: ABIRPC<T>, response: ABIRPCResponse) => void): this;
    once(event: "error", listener: (this: ABIRPC<T>, error: Error) => void): this;
    once(id: string, listener: (this: ABIRPC<T>, response: ABIRPCResponse) => void): this;
    response(response: ABIRPCResponse): Promise<void>;
    request<T>(request: ABIRPCRequest): Promise<T>;
}
export {};
