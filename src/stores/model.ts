/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/// <reference path="../../references/node.d.ts" />
/// <reference path="../../references/lodash.d.ts" />
/// <reference path="../../references/es6-promise.d.ts" />

import assert = require("assert");

import C = require("./contracts");
import Context = require("./context");

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
 *           of those described in C.IterationStatus.
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
class Model {
    annotate(ctx: Context, stopping?: number): C.IterationStatus {
        if (!this.inBeam) {
            this.x = ctx.x;
            this.y = ctx.y;
        }
        this.idx = ctx.idx;

        var ret: C.IterationStatus = this.annotateImpl(ctx);
        assert(ret !== undefined);
        if (ret !== C.IterationStatus.SUCCESS) {
            return ret;
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
    }

    static _generateKey(): number {
        return ++Model.lastKey;
    }

    get timeSignature(): C.ITimeSignature {
        assert(false, "Not a time signature");
        return null;
    }

    get barline(): C.Barline {
        assert(false, "Not a barline");
        return null;
    }

    annotateImpl(ctx: Context): C.IterationStatus {
        assert(false, "Not implemented");
        return null; // Not reached
    }

    visible() {
        return true;
    }

    render(fontSize: number) {
        assert(false, "Not implemented");
    }

    get annotatedExtraWidth(): number {
        return 0;
    }
    set annotatedExtraWidth(w: number) {
        if (w !== 0) {
            assert(false, "This element does not support annotatedExtraWidth " +
                "because its not a note");
        }
    }

    get isNote(): boolean {
        return false;
    }

    get isRest(): boolean {
        return false;
    }

    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        assert(false, "Not implemented");
    }

    static setView = function (View: (opts: { key: number; spec: Model; fontSize: number }) => any) {
        this.prototype.render = function (fontSize: number) {
            return View({
                key: this.key,
                spec: this,
                fontSize: fontSize
            });
        };
    };

    /**
     * Given an array of staves, remove all annotated objects
     * created through a Model.
     */
    static removeAnnotations = (staves: Array<C.IStave>) => {
        for (var i = 0; i < staves.length; ++i) {
            for (var j = 0; staves[i].body && j < staves[i].body.length; ++j) {
                var item = staves[i].body[j];
                if (item.source) {
                    staves[i].body.splice(j, 1);
                    --j;
                } else if (item.inBeam) {
                    item.inBeam = false;
                }
            }
        }
    };

    // FLAGS
    get inBeam(): boolean { return !!(this._flags & Flags.IN_BEAM); }
    set inBeam(v: boolean) {
        if (v) { this._flags = this._flags | Flags.IN_BEAM;
        } else { this._flags = this._flags & ~Flags.IN_BEAM; } }

    get placeholder() { return !!(this._flags & Flags.PLACEHOLDER); }
    set placeholder(v: boolean) {
        if (v) { this._flags = this._flags | Flags.PLACEHOLDER;
        } else { this._flags = this._flags & ~Flags.PLACEHOLDER; } }

    get selected() { return !!(this._flags & Flags.SELECTED); }
    set selected(v: boolean) {
        if (v) { this._flags = this._flags | Flags.SELECTED;
        } else { this._flags = this._flags & ~Flags.SELECTED; } }

    get source(): C.Source { return !!(this._flags & Flags.ANNOTATOR) ? C.Source.ANNOTATOR : C.Source.USER; }
    set source(source: C.Source) {
        if (source === C.Source.ANNOTATOR) { this._flags = this._flags | Flags.ANNOTATOR;
        } else { this._flags = this._flags & ~Flags.ANNOTATOR; } }

    key: number = Model._generateKey();
    x: number = NaN;
    y: number = NaN;
    endMarker: boolean;
    idx: number;
    _flags: number = 0;
    ctxData: {
        bar: number; beat: number
    };

    get type(): C.Type {
        return C.Type.UNKNOWN;
    }

    get note(): C.IPitchDuration {
        assert(false, "Not a note.");
        return null;
    }

    private static lastKey: number = 0;
}

enum Flags {
    IN_BEAM = 1,
    PLACEHOLDER = 2,
    SELECTED = 4,
    ANNOTATOR = 8
    // Subclasses are free to use flags above 128!!!
}

export = Model;
