/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import C = require("./contracts");
import TSEE = require("./tsee");

var CHANGE_EVENT = "change";

/**
 * Flux store for recent markings.
 */
class MarkingsStore extends TSEE {
    constructor(dispatcher: C.IDispatcher) {
        super();
        this._loadFromLocalStorage();
        this._dispatcher = dispatcher;

        this._dispatcher.register(this.handleAction.bind(this));
        global.MarkingsStore = this; // For debugging
    }

    handleAction(action: C.IFluxAction) {
        switch(action.description) {
            case "PUT /local/tool":
                var marking: C.IMarking = action.postData.metaInfo;
                marking.style = JSON.stringify(marking.style);
                for (var i = 0; i < this._model.length; ++i) {
                    if (this._model[i].glyph === marking.glyph) {
                        return true;
                    }
                }
                if (this._model.length === 22) {
                    this._model.splice(0, 1);
                }
                this._model.push(marking);
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
        this._model = JSON.parse(global.localStorage["markingsStore"] || "[]");
    }

    private _writeToLocalStorage() {
        if (!global.localStorage) {
            return;
        }
        global.localStorage["markingsStore"] = JSON.stringify(this._model);
    }

    private _removeDuplicatesAndClip() {
        var hash: {[key: string]: boolean} = {};
        var newModel: Array<C.IMarking> = [];
        for (var i = 0; i < this._model.length && newModel.length < 22; ++i) {
            if (!hash[this._model[i].glyph]) {
                hash[this._model[i].glyph] = true;
                newModel.push(this._model[i]);
            }
        }
        this._model = newModel;
    }

    private _dispatcher: C.IDispatcher;
    private _model: Array<C.IMarking>;
}

export = MarkingsStore;