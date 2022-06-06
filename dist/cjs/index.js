"use strict";
// Copyright (c) 2022 System233
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABIRPC = exports.ABIRPCError = void 0;
const events_1 = require("events");
const nanoid_1 = require("nanoid");
class ABIRPCError extends Error {
}
exports.ABIRPCError = ABIRPCError;
;
class ABIRPC extends events_1.EventEmitter {
    send;
    handler;
    option;
    timeout;
    constructor(send, handler, option) {
        super();
        this.send = send;
        this.handler = handler;
        this.option = option;
        this.timeout = option?.timeout || 10000;
    }
    call(name, ...data) {
        return this.request({
            type: 'request',
            name: name,
            data
        });
    }
    handle(request) {
        try {
            if (request.type == 'request') {
                const response = (code, message, data) => this.response({
                    type: 'response',
                    id: request.id,
                    name: request.name,
                    code,
                    data,
                    message
                });
                if (request.name in this.handler) {
                    try {
                        return Promise.resolve(Reflect.apply(Reflect.get(this.handler, request.name), this.handler, request.data))
                            .then(result => response(0, 'success', result))
                            .catch(error => response(-1, error + '', null));
                    }
                    catch (error) {
                        return response(-1, error + '', null);
                    }
                }
                else {
                    return response(-1, 'unknown method:' + request.name, null);
                }
            }
            else if (request.type == 'response' && request.id) {
                this.emit(request.id, request);
            }
            else {
                throw new ABIRPCError("bad request:" + request.type);
            }
        }
        catch (error) {
            this.emit('error', error);
        }
        return Promise.resolve();
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    response(response) {
        const { id, name, data, message, code } = response;
        return new Promise((resolve, reject) => this.send({ type: 'response', id, name, data, message, code }, (err) => err ? reject(err) : resolve()));
    }
    request(request) {
        return new Promise((resolve, reject) => {
            const id = request.id || (0, nanoid_1.nanoid)();
            const timeout = request.timeout || this.timeout;
            const { name, data } = request;
            const timer = setTimeout(() => error(new Error('Timeout:' + timeout)), timeout);
            const handler = (response) => {
                clearTimeout(timer);
                if (!response.code) {
                    resolve(response.data);
                }
                else {
                    reject(new ABIRPCError(`${response.message} (${response.code})`));
                }
            };
            const error = (e) => {
                this.removeListener(id, handler);
                reject(e);
            };
            this.once(id, handler);
            this.send({
                type: 'request',
                name,
                id,
                timeout,
                data
            }, e => e && error(e));
        });
    }
}
exports.ABIRPC = ABIRPC;
