/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React            = require("react");                     // For setView.
import assert           = require("assert");
import _                = require("lodash");
var    assign           = require("react/lib/Object.assign");

import Annotator        = require("./annotator");
import C                = require("./contracts");

/**
 * Subclasses of Models handle the gap between the abstract representation of
 * a score and the actual rendering (which is done by components in ./primitives).
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
    /////////////////////////////////////////
    // I.1 Properties common to all models //
    /////////////////////////////////////////

    /** Unique identifier for this instance */
    key:                string                  = Model.newKey();

    /** Calculated. Position in part */
    idx:                number                  = NaN;

    /** Calculated. From left, in tenths of a stave space */
    x:                  number                  = NaN;

    /** Calculated. From bottom, in tenths of a stave space */
    y:                  number                  = NaN;

    /** Calculated. Distance between this item and the next. */
    w:                  number                  = NaN;

    /**
     * Calculated. Offset due to right or center justification, in tenths of a
     * stave space. Note that Model.x takes spacing into account.
     */
    spacing:            number                  = 0;

    /** Calculated. The bar, beat of this model */
    ctxData:            C.MetreContext          = null;

    get isModifier() {
        return this.priority > C.Type.START_OF_MODIFIERS && this.priority < C.Type.END_OF_MODIFIERS;
    }

    ////////////////////////////////////
    // I.2 Flags common to all models //
    ////////////////////////////////////

    private _flags:     number                  = 0;
    get inBeam():       boolean     { return this._getFlag(Flags.InBeam); }
    set inBeam(b:       boolean)    {        this._setFlag(Flags.InBeam, b); }


    get placeholder():  boolean     { return this._getFlag(Flags.Placeholder); }
    set placeholder(b:  boolean)    {        this._setFlag(Flags.Placeholder, b); }

    get selected():     boolean     { return this._getFlag(Flags.Selected); }
    set selected(b:     boolean)    {        this._setFlag(Flags.Selected, b); }

    get annotated():    boolean     { return this._getFlag(Flags.Annotator); }
    set annotated(b:    boolean)    {        this._setFlag(Flags.Annotator, b); }

    get proposed():     boolean     { return this._getFlag(Flags.Proposed); }
    set proposed(b:     boolean)    {        this._setFlag(Flags.Proposed, b); }

    ////////////////////////////////////////////////////
    // I.3 Properties to be reimplemented by subtypes //
    ////////////////////////////////////////////////////

    endMarker:          boolean;
    beam:               C.IPitchDuration[];
    get note():         C.IPitchDuration        { throw "Not a Duration"; }
    get isNote():       boolean                 { return false; }
    get isRest():       boolean                 { return false; }
    get visible():      boolean                 { return true; }

    get xPolicy():      C.RectifyXPolicy        { throw "Not implemented"; }
    get type():         C.Type                  { throw "Not implemented"; }
    get fields():       string[]                { return []; }
    get mxmlJsonOnlyFields(): string[]          { return []; }

    get extraWidth(): number                    { return 0; }
    set extraWidth(w: number) {
        if (w !== 0) {
            assert(false, "This element does not support annotatedExtraWidth.");
        }
    }

    get revision():     string                  { throw "Not a Barline"; }
    set revision(n: string)                     { throw "Not a Barline"; }

    get priority():     C.Type                  { return this.type; }
    set priority(p: C.Type)                     { throw "Not a Placeholder"; }

    calcBeats(ctx: C.MetreContext)              { return 0; }

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: any, annotated: boolean) {
        // By only setting attributes in the white-lists, we make omissions in
        // fields more obvious.
        var _this: any = this;
        var allFields = this.fields.concat(this.mxmlJsonOnlyFields);
        for (var i = 0; i < allFields.length; ++i) {
            if (spec.hasOwnProperty(allFields[i])) {
                var key     = allFields[i];
                _this[key]  = spec[key];
            }
        }

        if (spec.key) {
            this.key        = spec.key;
            this._flags     = spec._flags;
        }

        if (spec.x) {
            this.x          = spec.x;
            this.y          = spec.y;
        }

        this.annotated      = annotated;
    }

    modelDidLoad(body: Array<Model>, idx: number) {
        // pass
    }

    annotate(ctx: Annotator.Context): C.IterationStatus {
        if (!this.inBeam) {
            // Beamed notes are placed by the BeamGroupModel
            this.x              = ctx.x;
            this.y              = ctx.y;
            if (!this.isNote || !this.note.temporary) {
                // Temporary (preview) notes retain their old spacing.
                this.spacing    = 0;
            }
        }

        this.idx                = ctx.idx;
        var status              = this.annotateImpl(ctx);
        this.proposed           = false;

        assert(status !== undefined);
        return status;
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        throw C.Type[this.type] + " does not implement annotateImpl.";
    }

    recordMetreDataImpl(mctx: C.MetreContext): void {
        assert(false, "Not implemented");
    }

    render(options?: any): React.ReactElement<any> {
        throw "No view has been set for " + C.Type[this.type] + ". See Model.setView(...)";
    }

    //////////////////////
    // III. Convenience //
    //////////////////////

    toJSON(): {} {
        var json: {} = {
            _: [this.key, this.type, this._flags]
        };

        _.forEach(this.fields, value => {
            if (!!(<any>this)[value]) {
                (<any>json)[value] = (<any>this)[value];
            }
        });

        return json;
    }

    assign<T>(obj: T) {
        _.forEach(obj, (value, key) => {
            (<any>this)[key] = C.JSONx.clone(value);
        });
    }

    protected _getFlag(f: number) {
        return !!(this._flags & f);
    }
    protected _setFlag(f: number, v: boolean) {
        this._flags = v ? (this._flags | f) : (this._flags & ~f);
    }

    ////////////////
    // IV. Static //
    ////////////////

    static _sessionId:  string                  = C.generateUUID();
    static _lastKey:    number                  = 0;

    /**
     * Sets the type used for render().
     */
    static setView = function (View: (opts: { key: number; spec: Model;}) => any) {
        this.prototype.render = function (options: any) {
            var props = assign({}, options, {key: this.key, spec: this});
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
                if (item.annotated && !item.placeholder) {
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

        if (json instanceof Model) {
            json = C.JSONx.clone(json);
        } else if (typeof json === "string" || json instanceof String) {
            spec = JSON.parse(<string> json);
        } else {
            spec = json;
        }

        var _data = spec._;
        delete spec._;
        spec.key        = _data[0];
        var type        = _data[1];
        spec._flags     = _data[2];

        var model = (existingObjects && existingObjects[spec.key]) || Model.constructorsByType[type](spec);
        assert(model);

        var modelObj: { [key: string]: any } = <any> model;
        assert(model);
        _.each(spec, (value: any, key: string) => {
            if (modelObj[key] !== value) {
                console.warn("Not loading saved key \"" + key + "\" in type " + C.Type[model.type] + ":", value);
            }
        });

        return model;
    }

    /**
     * Creates a new unique identifier for an instance of a model.
     */
    static newKey(): string {
        return Model._sessionId + "-" + ++Model._lastKey;
    }
}

module Model {
    "use strict";

    /**
     * See types.ts
     */
    export var constructorsByType: { [key: number /* C.Type */]: (spec: any) => Model } = {};

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
        get retryStatus() { return C.IterationStatus.RetryCurrent; }
    }
}

enum Flags {
    InBeam              = 2 << 0,
    Placeholder     	= 2 << 1,
    Selected        	= 2 << 2,
    Annotator       	= 2 << 3,
    Proposed        	= 2 << 4
    // Model-specific  >= 2 << 6
}

export = Model;
