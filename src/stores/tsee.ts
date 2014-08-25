/**
 * @file Wrapper for EventEmitter needed because EventEmitter is modeled by DefinitelyTyped
 * as an interface as opposed to a class.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import EventEmitter = require("events");

class TSEE {
    constructor() {
        (<any>EventEmitter.EventEmitter).call(this);
    }

    public addListener(event: string, listener: Function) {
        (<any>EventEmitter.EventEmitter).prototype.addListener.call(this, event, listener);
    }

    public on(event: string, listener: Function): any {
        return (<any>EventEmitter.EventEmitter).prototype.on.call(this, event, listener);
    }

    public once(event: string, listener: Function): void {
        (<any>EventEmitter.EventEmitter).prototype.once.call(this, event, listener);
    }

    public removeListener(event: string, listener: Function): void {
        (<any>EventEmitter.EventEmitter).prototype.removeListener.call(this, event, listener);
    }

    public removeAllListener(event: string): void {
        (<any>EventEmitter.EventEmitter).prototype.removeAllListener.call(this, event);
    }

    public setMaxListeners(n: number): void {
        (<any>EventEmitter.EventEmitter).prototype.setMaxListeners.call(this, n);
    }

    public listeners(event: string): { Function: any; }[]{
        return (<any>EventEmitter.EventEmitter).prototype.listeners.call(this, event);
    }

    public emit(event: string, arg1?: any, arg2?: any): void {
        (<any>EventEmitter.EventEmitter).prototype.emit.call(this, event, arg1, arg2);
    }
}

export = TSEE;
