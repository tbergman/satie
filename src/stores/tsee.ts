/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import EventEmitter = require("events");

/**
 * @file Wrapper for EventEmitter needed because EventEmitter is modeled by DefinitelyTyped
 * as an interface as opposed to a class.
 */
class TSEE {
    constructor() {
        (<any>EventEmitter.EventEmitter).call(this);
    }

    public addListener(event: number, listener: Function) {
        (<any>EventEmitter.EventEmitter).prototype.addListener.call(this, event, listener);
    }

    public on(event: number, listener: Function): any {
        return (<any>EventEmitter.EventEmitter).prototype.on.call(this, event, listener);
    }

    public once(event: number, listener: Function): void {
        (<any>EventEmitter.EventEmitter).prototype.once.call(this, event, listener);
    }

    public removeListener(event: number, listener: Function): void {
        (<any>EventEmitter.EventEmitter).prototype.removeListener.call(this, event, listener);
    }

    public removeAllListener(event: number): void {
        (<any>EventEmitter.EventEmitter).prototype.removeAllListener.call(this, event);
    }

    public setMaxListeners(n: number): void {
        (<any>EventEmitter.EventEmitter).prototype.setMaxListeners.call(this, n);
    }

    public listeners(event: number): { Function: any; }[]{
        return (<any>EventEmitter.EventEmitter).prototype.listeners.call(this, event);
    }

    public emit(event: number, arg1?: any, arg2?: any): void {
        (<any>EventEmitter.EventEmitter).prototype.emit.call(this, event, arg1, arg2);
    }
}

export = TSEE;
