/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import assert = require("assert");

import C = require("./contracts");
import Dispatcher = require("./dispatcher");
import TSEE = require("./tsee");

var CHANGE_EVENT = "change";

/**
 * Flux store for recent markings.
 */
export class MarkingsStore extends TSEE {
    constructor(dispatcher: Dispatcher.Dispatcher) {
        super();
        this._loadFromLocalStorage();
        this._dispatcher = dispatcher;

        this._dispatcher.register(this.handleAction.bind(this));
    }

    handleAction(action: C.IFluxAction) {
        switch(action.description) {
            case "PUT /local/marking":
                assert("glyph" in action.postData);
                assert("x" in action.postData);
                assert("y" in action.postData);
                assert("scale" in action.postData);
                this._model.push(action.postData);
                this._removeDuplicatesAndClip();
                this._writeToLocalStorage();
                this.emit(CHANGE_EVENT);
        }
        return true;
    }

    addChangeListener(callback: any) {
        this.on(CHANGE_EVENT, callback); }

    removeChangeListener(callback: any) {
        this.removeListener(CHANGE_EVENT, callback); }

    get markings() {
        return this._model; }

    private _loadFromLocalStorage() {
        if (!global.localStorage) {
            return;
        }
        this._model = JSON.parse(global.localStorage.sessionStore || "[]");
    }

    private _writeToLocalStorage() {
        if (!global.localStorage) {
            return;
        }
        global.localStoage = JSON.stringify(this._model);
    }

    private _removeDuplicatesAndClip() {
        var hash: {[key: string]: boolean} = {};
        var newModel: Array<IMarking> = [];
        for (var i = 0; i < this._model.length && newModel.length < 22; ++i) {
            if (!hash[this._model[i].glyph]) {
                hash[this._model[i].glyph] = true;
                newModel.push(this._model[i]);
            }
        }
        this._model = newModel;
    }

    private _dispatcher: Dispatcher.Dispatcher;
    private _model: Array<IMarking>;
}

export interface IMarking {
    glyph: string;
    noDirection: boolean;
    x: number;
    y: number;
    scale: number;
};