/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react"); // For TSX in setView.
import assert = require("assert");

import C = require("./contracts");
import Annotator = require("./annotator");

import _ = require("lodash");
var assign = require("react/lib/Object.assign");

/**
 * Subclasses of Models handle the gap between the abstract representation of
 * a score (as, for example, parsed in lylite.jison) and the actual rendering
 * (which is done by components in ./primitives).
 * 
 * In particular, classes which extend Model provide three two functions:
 *   - annotateImpl: adds any missing information (default values) not provided
 *      by the parser, adds any missing elements (e.g., clefs, time signatures,
 *      line breaks) to part.body
 *   - render: returns the instance of a React component which renders the
 *      component. Does not accept anything. Any processing should be done in
 *      annotateImpl.
 * 
 * To see the kind of information held by Models, in your web browser's
 * console, look at 'SongEditorStore.parts()[...].body'. Every item is a Model.
 */
class Model {
    annotate(ctx: Annotator.Context): C.IterationStatus {
        if (!this.inBeam) {
            // Beamed notes are placed by the BeamGroupModel
            this.x = ctx.x;
            this.y = ctx.y;
            this.spacing = 0;
        }
        this.idx = ctx.idx;

        var ret: C.IterationStatus = this.annotateImpl(ctx);
        assert(ret !== undefined);
        if (ret === C.IterationStatus.Success && this.source === C.Source.UserProposed) {
            this.source = C.Source.User;
        }
        return ret;
    }

    modelDidLoad(body: Array<Model>, idx: number) {
        // Pass
    }

    /**
     * TODO: child models should fully manage the spec.
     */
    constructor(spec: any) {
        assert(this instanceof Model);
        var self: { [key: string]: any } = <any> this;
        for (var prop in spec) {
            if (spec.hasOwnProperty(prop) && prop !== "type") {
                self[prop] = spec[prop];
            }
        }
    }

    static _sessionId: string = _sessionId(); // TODO: Make sure this isn't a duplicate.
    static _lastKey = 0;

    static _generateKey(): string {
        return Model._sessionId + "-" + ++Model._lastKey;
    }

    get timeSignature(): C.ITimeSignature {
        assert(false, "Not a time signature");
        return null;
    }

    get barline(): C.Barline {
        assert(false, "Not a barline");
        return null;
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        assert(false, "Not implemented");
        return null; // Not reached
    }

    recordMetreDataImpl(mctx: C.MetreContext): void {
        assert(false, "Not implemented");
    }

    visible(): boolean {
        return true;
    }

    render(fontSize: number, options?: any): React.ReactComponentElement<any> {
        throw "Not implemented";
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

    // FIXME: key is now a string
    static setView = function (View: (opts: { key: number; spec: Model; fontSize: number }) => any) {
        this.prototype.render = function (fontSize: number, options: any) {
            var props = assign({}, options, {key: this.key, spec: this, fontSize: fontSize});
            return React.createElement(View, props);
        };
    };

    /**
     * Given an array of parts, remove all annotated objects
     * created through a Model.
     */
    static removeAnnotations = (parts: Array<C.IPart>) => {
        for (var i = 0; i < parts.length; ++i) {
            for (var j = 0; parts[i].body && j < parts[i].body.length; ++j) {
                var item = parts[i].body[j];
                if (item.source === C.Source.Annotator && !item.placeholder) {
                    for (var k = 0; k < parts.length; ++k) {
                        if (parts[k].body) {
                            parts[k].body.splice(j, 1);
                        }
                    }
                    --j;
                } else if (item.inBeam) {
                    item.inBeam = false;
                }
            }
        }
    };

    getBeats(ctx: C.MetreContext) {
        return 0;
    }

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

    get source(): C.Source {
        if (!!(this._flags & Flags.PROPOSED) && !(this._flags & Flags.ANNOTATOR)) {
            return C.Source.UserProposed;
        } else if (!(this._flags & Flags.PROPOSED) && !(this._flags & Flags.ANNOTATOR)) {
            return C.Source.User;
        } else if (!(this._flags & Flags.PROPOSED) && !!(this._flags & Flags.ANNOTATOR)) {
            return C.Source.Annotator;
        }
        assert(false, "Unknown source");
    }
    set source(source: C.Source) {
        if (source === C.Source.Annotator) {
            this._flags = this._flags | Flags.ANNOTATOR;
            this._flags = this._flags & ~Flags.PROPOSED;
        } else if (source === C.Source.User) {
            this._flags = this._flags & ~Flags.ANNOTATOR;
            this._flags = this._flags & ~Flags.PROPOSED;
        } else if (source === C.Source.UserProposed) {
            this._flags = this._flags & ~Flags.ANNOTATOR;
            this._flags = this._flags | Flags.PROPOSED;
        }
    }

    toJSON(): {} {
        return {
            key: this.key,
            type: C.Type[this.type],
            _flags: this._flags
        };
    }

    /**
     * Return a Model that is equivalent to one that has been JSON.stringified.
     * 
     * @param json Model, stringified model, or parsed stringified model
     * @param exisistingObjects Optional dictionary from keys to existing Models.
     *   If a model with the same key exists, it will be updated. Otherwise, a new
     *   model will be created.
     */
    static fromJSON(json: Object, existingObjects?: { [key: string]: Model }): Model;

    /**
     * Return a Model that is equivalent to one that has been JSON.stringified.
     * 
     * @param json Model, stringified model, or parsed stringified model
     * @param exisistingObjects Optional dictionary from keys to existing Models.
     *   If a model with the same key exists, it will be updated. Otherwise, a new
     *   model will be created.
     */
    static fromJSON(json: string, existingObjects?: { [key: string]: Model }): Model;

    static fromJSON(json: any, existingObjects?: { [key: string]: Model } ): Model {
        var spec: any;
        if (typeof json === "string" || json instanceof String) {
            spec = JSON.parse(<string> json);
        } else {
            spec = json;
        }
        var model = (existingObjects && existingObjects[spec.key]) || Model.constructorsByType[spec.type](spec);
        var modelObj: { [key: string]: any } = <any> model;
        assert(model);
        _.each(spec, (value: any, key: string) => {
            if (key !== "_priority") { // HACK: _priority should be a number.
                modelObj[key] = value;
            }
        });
        return model;
    }

    key: string = Model._generateKey();
    x: number = NaN;
    y: number = NaN;
    cachedSpacing: number = 0;
    spacing: number = 0;
    endMarker: boolean;
    idx: number;
    _flags: number = 0;
    ctxData: C.MetreContext;

    get type(): C.Type {
        return C.Type.Unknown;
    }

    get note(): C.IPitchDuration {
        assert(false, "Not a note.");
        return null;
    }

    get revision(): string {
        assert(false, "Not implemented for this type");
        return "";
    }

    set revision(n: string) {
        assert(false, "Not implemented for this type");
    }

    get priority(): C.Type {
        return this.type;
    }

    set priority(p: C.Type) {
        assert(false, "Setting priority is not implemented for this type.");
    }

    get isModifier() {
        return this.priority > C.Type.START_OF_MODIFIERS && this.priority < C.Type.END_OF_MODIFIERS;
    }

    beam: Array<C.IPitchDuration>;

    static constructorsByType: { [key: string /* C.Type */]: (spec: any) => Model } = {};
}

enum Flags {
    IN_BEAM = 2 << 0,
    PLACEHOLDER = 2 << 1,
    SELECTED = 2 << 2,
    ANNOTATOR = 2 << 3,
    PROPOSED = 2 << 4
    // model-specific = 2 << 6
}

function _sessionId(): string {
    "use strict";
    return (Math.random().toString(16) + "000000000").substr(2, 8);
}

module Model {
    "use strict";

    /**
     * Types that do not support adjacent models of the same type.
     */
    export class StateChangeModel extends Model {
        annotate(ctx: Annotator.Context) {
            if (ctx.next(null, 1, true).priority === this.type) {
                // Find real versions of every part, if possible.
                var here = ctx.findVertical(null, this.idx);
                var next = ctx.findVertical(null, this.idx + 1);
                var combined = new Array(here.length);
                for (var i = 0; i < combined.length; ++i) {
                    if (!next[i].placeholder) {
                        combined[i] = next[i];
                    } else {
                        combined[i] = here[i];
                    }
                }
                for (var i = 0; i < ctx._parts.length; ++i) {
                    ctx._parts[i].body.splice(ctx.idx, 1);
                    ctx._parts[i].body[ctx.idx] = combined[i];
                }
                return this.retryStatus;
            }

            return super.annotate(ctx);
        }
        retryStatus = C.IterationStatus.RetryCurrent;
    }
}

export = Model;
global.Model = Model; // For debugging
