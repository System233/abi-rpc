// Copyright (c) 2022 System233
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT


import { EventEmitter } from "events";
import { nanoid } from "nanoid";

const kABIRPCI=Symbol("kABIRPCI");
export interface ABIRPCRequest<T = any> {
    type?: 'request',
    id?: string;
    name: string;
    data: T;
    timeout?: number;
}
export interface ABIRPCResponse<T = any> {
    type?: 'response',
    id?: string;
    name: string;
    data: T;
    code: number;
    message: string;
}
export type WebSocketData<T=any> = ABIRPCRequest<T> | ABIRPCResponse<T>;
type KeyOfType<T, F> = { [K in keyof T]: T[K] extends F ? K : never }[keyof T];

export class ABIRPCError extends Error { };
export interface ABIRPCOption {
    timeout?: number;
}
export const GetABIPRC=<T extends Record<string, any>>(target:object)=>{
    return Reflect.get(target,kABIRPCI) as ABIRPC<T>;
}

export class ABIRPC<T extends Record<string, any>> extends EventEmitter {
    private timeout: number;
    constructor(public sender: <T>(data:WebSocketData<T>,err:(error:Error)=>void)=>void, public handler: Record<string, any>, public option?: ABIRPCOption) {
        super();
        Reflect.set(handler,kABIRPCI,this);
        this.timeout = option?.timeout || 10000;
    }

    call<K extends KeyOfType<T, Function>>(name: K, ...data: Parameters<T[K]>): Promise<ReturnType<T[K]>> {
        return this.request({
            type: 'request',
            name: name as string,
            data
        });
    }
    handle(request: WebSocketData):Promise<void> {
        try {
            if (request.type == 'request') {
                const response = (code: number, message: string, data: any) => this.response({
                    type: 'response',
                    id: request.id,
                    name: request.name,
                    code,
                    data,
                    message
                });
                if (request.name in this.handler) {
                    try {
                        return Promise.resolve(Reflect.apply(Reflect.get(this.handler,request.name),this.handler,request.data))
                        .then(result=>response(0, 'success', result))
                        .catch(error=>response(-1, error + '', null));
                    } catch (error) {
                        return response(-1, error + '', null);
                    }
                } else {
                    return response(-1, 'unknown method:' + request.name, null);
                }
            } else if (request.type == 'response' && request.id) {
                this.emit(request.id, request);
            } else {
                throw new ABIRPCError("bad request:"+request.type);
            }
        } catch (error) {
            this.emit('error', error);
        }
        return Promise.resolve();
    }
    on(event: "error", listener: (this: ABIRPC<T>, error: Error) => void): this;
    on(id: string, listener: (this: ABIRPC<T>, response: ABIRPCResponse) => void): this;
    on(event: string | symbol, listener: (this: ABIRPC<T>, ...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    once(event: "error", listener: (this: ABIRPC<T>, error: Error) => void): this;
    once(id: string, listener: (this: ABIRPC<T>, response: ABIRPCResponse) => void): this;
    once(event: string | symbol, listener: (this: ABIRPC<T>, ...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    response(response: ABIRPCResponse) {
        const { id, name, data, message, code } = response;
        return new Promise<void>((resolve, reject) => this.sender({type:'response',id, name, data, message, code}, (err) => err ? reject(err) : resolve()));
    }
    request<T>(request: ABIRPCRequest) {
        return new Promise<T>((resolve, reject) => {
            const id = request.id || nanoid();
            const timeout = request.timeout || this.timeout;
            const { name, data } = request;
            const timer = setTimeout(() => error(new Error('Timeout:' + timeout)), timeout)
            const handler = (response: ABIRPCResponse) => {
                clearTimeout(timer);
                if (!response.code) {
                    resolve(response.data);
                } else {
                    reject(new ABIRPCError(`${response.message} (${response.code})`));
                }
            }
            const error = (e?: Error) => {
                this.removeListener(id, handler);
                reject(e);
            }
            this.once(id, handler);
            this.sender({
                type: 'request',
                name,
                id,
                timeout,
                data
            }, e => e && error(e));
        });
    }
}