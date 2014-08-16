/**
 * Subclasses of Models handle the gap between the abstract representation of
 * a score (as, for example, parsed in lylite.jison) and the actual rendering
 * (which is done by components in ./primitives).
 *
 * In particular, classes which extend Model provide three key items:
 *   - prereqs: an array of prerequisites. Each prerequisite is an array with
 *      the following:
 *        1. a function which accepts a ctx and returns true if the
 *           precondition is satisfied and false otherwise.
 *        2. a function which accepts a ctx, stave, and idx and performs
 *           actions which make the precondition true. The exit code is one
 *           of those described in IterationStatus.
 *        3. A description of the precondition, in English, for debugging.
 *             
 *   - annotateImpl: adds any missing information (default values) not provided
 *      by the parser, adds any missing elements (e.g., clefs, time signatures,
 *      line breaks) to stave.body
 *   - render: returns the instance of a React component which renders the
 *      component. Does not accept anything. Any processing should be done in
 *      annotateImpl.
 *
 * To see the kind of information held by Models, in your web browser's
 * console, run 'SongEditorStore.staves()[3].body'. Every item is a Model.
 */

/// <reference path="node.d.ts" />
/// <reference path="lodash.d.ts" />
/// <reference path="es6-promise.d.ts" />
/// <reference path="../promos/scales/scaleGenerator.d.ts" />

import assert = require("assert");
import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");

class Model {
    _annotated: string; // Reason for being created.
    _fontSize: number;
    _key: string;
    _x: number;
    _y: number;
    ctxData: {
        bar: number;
        beat: number;
    };
    endMarker: boolean;
    idx: number;
    intersects: Array<Model> = null;
    inBeam: boolean;
    name: string;
    prereqs: Array<SmartCondition>;
    placeholder: boolean;
    selected: boolean;

    get type(): Contracts.ModelType {
        assert(false, "Not implemented");
        return Contracts.ModelType.UNKNOWN;
    }

    annotate(ctx: Context, stopping?: number): IterationStatus {
        if (!this.inBeam) {
            this.setX(ctx.x);
            this.setY(ctx.y);
        }
        this.idx = ctx.idx;
        this._fontSize = ctx.fontSize;
        for (var i = 0; i < this.prereqs.length; ++i) {
            if (!this.prereqs[i].condition.call(this, ctx)) {
                var exitCode: IterationStatus =
                        this.prereqs[i].correction.call(this, ctx);
                if (stopping) {
                    console.warn(" -" + this.prereqs[i].description,
                        "(code: " + exitCode + ")");
                }
                if (exitCode !== IterationStatus.SUCCESS) {
                    return exitCode;
                }
            }
        }

        var ret: IterationStatus = this.annotateImpl(ctx);
        if (ret !== IterationStatus.SUCCESS) {
            return ret;
        }

        if (!this._key) {
            this._key = this._generateKey(ctx);
        }
        return ret;
    }

    /**
     * TODO: child models should fully manage the spec.
     */
    constructor(spec: any) {
        assert(this instanceof Model);
        var self: { [key: string]: any } = <any> this;
        for (var prop in spec) {
            if (spec.hasOwnProperty(prop)) {
                self[prop] = spec[prop];
            }
        }
        this.name = Object.getPrototypeOf(this).constructor.name;
    }

    _generateKey(ctx: Context): string {
        return "" + ++lastKey;
    }

    key() : string {
        return this._key;
    }

    fontSize() {
        return this._fontSize;
    }

    annotateImpl(ctx: Context): IterationStatus {
        assert(false, "Not implemented");
        return null; // Not reached
    }

    visible() {
        return true;
    }

    render() {
        assert(false, "Not implemented");
    }

    x() : number {
        return this._x;
    }

    y() : number {
        return this._y;
    }

    setX(x: number) : void {
        this._x = x;
    }

    setY(y: number) : void {
        this._y = y;
    }

    get isNote() : boolean {
        return false;
    }

    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        assert(false, "Not implemented");
    }

    static setView = function (View: (opts: { key: string; spec: Model }) => any ) {
        this.prototype.render = function() {
            return View({
                key: this.key(),
                spec: this
            })
        }
    }

    /**
    * Given an array of staves, remove all annotated objects
    * created through a Model.
    */
    static removeAnnotations = (staves: Array<Contracts.Stave>) => {
        for (var i = 0; i < staves.length; ++i) {
            for (var j = 0; staves[i].body && j < staves[i].body.length; ++j) {
                var item = staves[i].body[j];
                if (item._annotated) {
                    staves[i].body.splice(j, 1);
                    --j;
                } else if (item.inBeam) {
                    delete item.inBeam;
                }
            }
        }
    };
}

var lastKey: number = 0;

export = Model;
