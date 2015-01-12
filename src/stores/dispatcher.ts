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

import _        = require("lodash");
import assert   = require("assert");

import C        = require("./contracts");
import ajax     = require("../util/ajax");
import types    = require("./types");

var isBrowser   = typeof window !== "undefined";
var FLUX_DEBUG  = isBrowser && global.location.search.indexOf("fluxDebug=1") !== -1;

/**
 * @file Dispatcher lightly based on the Flux TodoMVC Tutorial.
 * http://facebook.github.io/react/docs/flux-todo-list.html
 * 
 * "Flux is the application architecture that Facebook uses for building
 * client-side web applications. It complements React's composable view
 * components by utilizing a unidirectional data flow. It's more of a pattern
 * rather than a formal framework, and you can start using Flux immediately
 * without a lot of new code."
 */
class Dispatcher implements C.IDispatcher {
    constructor() {
        types.ensureRegistered();
    }
    register(callback: (payload: any) => boolean) {
        this._callbacks.push(callback);
        return this._callbacks.length - 1; // index
    }

    unregister(callback: (payload: any) => boolean) {
        this._callbacks = this._callbacks.filter(cb => cb !== callback);
    }

    DELETE(url: string, p?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void): void {
        return this._dispatch(url, "DELETE", p, onSuccess, onError); }
    GET(url: string, p?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void): void {
        return this._dispatch(url, "GET", p, onSuccess, onError); }
    PATCH(url: string, p?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void): void {
        return this._dispatch(url, "PATCH", p, onSuccess, onError); }
    POST(url: string, p?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void): void {
        return this._dispatch(url, "POST", p, onSuccess, onError); }
    PUT(url: string, p?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void): void {
        return this._dispatch(url, "PUT", p, onSuccess, onError); }

    _dispatch: (url: string, verb: string, postData: any, onSuccess?: (response: any) => void,
                onError?: (error: any) => void) => void =
            _.debounce((url: string, verb: string, postData: any, onSuccess?: (response: any) => void,
                onError?: (error: any) => void) => {
        assert(verb, "Verb must be defined");

        var root = url;
        var resource: string = null;
        var query: string = null;

        if (root.indexOf("?") !== -1) {
            query = root.substr(root.indexOf("?") + 1);
            root = root.substr(0, root.indexOf("?"));
        }
        if (root.indexOf("/_") !== -1) {
            resource = root.substr(root.indexOf("/_") + 2);
            root = root.substr(0, root.indexOf("/_"));
        }

        if (verb === "GET") {
            ajax.untrusted.getJSON(url, (response: any, request: XMLHttpRequest) => {
                this._dispatchImpl({
                    description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
                    status: request.status,
                    resource: resource,
                    query: query,
                    url: url,
                    response: response,
                    postData: null
                }, onSuccess, onError);
            });
        } else if (verb in immediateActions) {
            this._dispatchImpl({
                description: verb + " " + root,
                resource: resource,
                response: null,
                status: null,
                query: query,
                postData: postData
            }, fireAction, onError);
        }

        function fireAction() {
            if ((verb in networkActions) && !url.indexOf("/api")) {
                ajax.untrusted.anyJSON(verb, url, postData, (response: any, request: XMLHttpRequest) => {
                    this._dispatchImpl({
                        description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
                        status: request.status,
                        resource: resource,
                        query: query,
                        url: url,
                        response: response,
                        postData: null
                    }, onSuccess, onError);
                });
            } else {
                _.defer(() => onSuccess(null));
            }
        }
    }, 0);

    /**
     * For debugging
     */
    _events: string = "";

    private _inAction: string = null;

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    private _dispatchImpl<PostData, Response>(action: C.IFluxAction<PostData>,
            onSuccess?: (payload?: any) => void,
            onError?: (err?: any) => void) {
        if (FLUX_DEBUG) {
            console.log(action.description +
                (action.resource ? " " + action.resource : ""),
                (action.query ? " " + action.query : ""),
                (action.postData ? [action.postData] : []), [action]);
        }

        if (global.localStorage && localStorage["superCowPowers"]) {
            if (this._events.length > 12000) {
                this._events = this._events.substr(this._events.length - 12000);
            }
            var done = action.description.indexOf(" DONE") !== -1;
            var errord = action.description.indexOf(" ERROR") !== -1;
            this._events += action.description.replace(" DONE", "").replace(" ERROR", "");
            if (action.resource) {
                this._events += "/_" + action.resource;
            }
            if (action.query) {
                this._events += "?" + action.query;
            }
            if (done) {
                this._events += " ✓";
            }
            if (errord) {
                this._events += " ✗";
            }
            if (action.postData) {
                var data = JSON.stringify(action.postData, null, 2);
                if (data.length > 400) {
                    this._events += "(" + data.length + " characters omitted…)";
                } else {
                    var lines = data.split("\n");
                    if (lines.length > 1) {
                        this._events += "(" + lines.map((v, i) => (i ? "  " : "") + v).join("\n") + ")";
                    } else if (lines.length === 1) {
                        this._events += "(" + lines[0] + ")";
                    }
                }
            }
            this._events += "\n";
        }

        try {
            this._inAction = action.description;
            _.forEach(this._callbacks, callback => {
                callback(action);
            });
            this._inAction = null;
        } catch(err) {
            this._inAction = null;
            if (err instanceof C.DispatcherRedirect) {
                var redirect: C.DispatcherRedirect = err;
                this._dispatch(redirect.newUrl, redirect.verb, redirect.postData);
            }
            if (onError) {
                onError(err);
            } else {
                console.warn("Exception occurred in promise", err);
                console.log(err.stack);
            }
        }
        if (onSuccess) {
            onSuccess(action);
        }
    }

    _callbacks: Array<(payload: any) => boolean> = [];
}

var immediateActions = {
    PATCH: true,
    PUT: true,      // update the server (replace an existing item)
    POST: true,     // update the server (create a new item)
    DELETE: true    // deactivate a local object
};

var networkActions = {
    GET: true,
    PATCH: true,
    POST: true,
    PUT: true,
    DELETE: true
};

export = Dispatcher;
