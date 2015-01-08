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

import React            = require("react");                     // For setView.
import assert           = require("assert");
import _                = require("lodash");
var    assign           = require("react/lib/Object.assign");

import Annotator        = require("./annotator");
import C                = require("./contracts");

/**
 * Models make up the body of a C.IVoice. They are processed by an Annotator.Annotator and modify
 * an Annotator.Context. They may or may not be rendered by the Renderer. Examples of Models include
 * Clefs, Durations, Barlines, and Attributes. A full list of subtypes is available in "types.ts".
 *
 * Models are created with a specification which may be incomplete. For example, before annotation,
 * they may not include position or timing information. Types which extend Model implement two
 * functions which put Models into a state where they can be rendered or played back:
 * 
 *   - recordMetreDataImpl: sets the current bar/division of the current model and
 *      other state related to timing. Increments the bar/division of the
 *      C.IMetreContext passed in.
 *   - annotateImpl: Ensures that the state passed in supports the model, and adds/removes
 *      other models to the context's active voice so that the current Model is valid.
 *      Records the Model's position and other appearance properties.
 */
class Model {

    /*---- I.1 Properties common to all models --------------------------------------------------*/

    /** Unique identifier for this instance */
    key:                string                  = Model.newKey();

    /** Calculated. Position in voice */
    idx:                number                  = NaN;

    /** Calculated. From left, in tenths of a stave space */
    x:                  number                  = NaN;

    /** Calculated. From bottom, in tenths of a stave space */
    y:                  number                  = NaN;

    /** Calculated. Distance between this item and the next. */
    w:                  number                  = NaN;

    /** Calculated. True if the item has no width and is not rendered. See prototype. */
    soundOnly:          boolean;

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

    get staff():        number {
        return -1;  // -1 means staff === voice if voice <= staves.length. Otherwise, an exception is thrown.
    }

    /*---- I.2 Flags common to all models -------------------------------------------------------*/

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

    get engraved():     boolean     { return this._getFlag(Flags.Engraved); }
    set engraved(b:     boolean)    {        this._setFlag(Flags.Engraved, b); }

    /*---- I.3 Properties to be reimplemented by subtypes ---------------------------------------*/

    endMarker:          boolean;
    beam:               C.IPitchDuration[];
    get note():         C.IPitchDuration        { throw "Not a Duration"; }
    get isNote():       boolean                 { return false; }
    get isRest():       boolean                 { return false; }
    get visible():      boolean                 { return !this.soundOnly; }

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

    get isAttribute():  boolean {
        return this.priority > C.Type.START_OF_ATTRIBUTES && this.priority < C.Type.END_OF_ATTRIBUTES;
    }

    get revision():     string                  { throw "Not a Barline"; }
    set revision(n: string)                     { throw "Not a Barline"; }

    get priority():     C.Type                  { return this.type; }
    set priority(p: C.Type)                     { throw "Not a Placeholder"; }

    calcDivisions(ctx: C.MetreContext)          { return 0; }


    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: any, annotated: boolean, engraved: boolean = false) {
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

        if (spec.key && !(spec instanceof Model)) {
            this.key        = spec.key;
            this._flags     = spec._flags;
        }

        if (spec.x) {
            this.x          = spec.x;
            this.y          = spec.y;
        }

        this.engraved       = engraved;
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

        var invisible = ctx.invisibleForBars && (ctx.invisibleForBars !== 1 || this.type !== C.Type.Barline);
        if (invisible) {
            this.soundOnly = true;
        } else if (this.soundOnly) {
            delete this.soundOnly;
        }

        this.idx                = ctx.idx;
        var status              = this.annotateImpl(ctx);
        this.proposed           = false;

        if (invisible) { // The value before "annotateImpl"
            ctx.x               = this.x;
        }

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

    /*---- III. Utilities -----------------------------------------------------------------------*/

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

    /*---- IV. Static----------------------------------------------------------------------------*/

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
     * Given an array of voices, remove all annotated objects
     * created through a Model.
     */
    static removeAnnotations = (voices: Array<C.IVoice>) => {
        for (var i = 0; i < voices.length; ++i) {
            for (var j = 0; voices[i].body && j < voices[i].body.length; ++j) {
                var item = voices[i].body[j];
                if (item.annotated && !item.placeholder) {
                    for (var k = 0; k < voices.length; ++k) {
                        if (voices[k].body) {
                            voices[k].body.splice(j, 1);
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

Model.prototype.soundOnly = false;

module Model {
    "use strict";

    /**
     * Map from Type ID in contracts.ts to constructor. See types.ts
     */
    export var constructorsByType: { [key: number /* C.Type */]: (spec: any) => Model } = {};

    /**
     * Types that do not support adjacent models of the same type.
     */
    export class SubAttributeModel extends Model {
        annotate(ctx: Annotator.Context) {
            var next = ctx.next(null, 1, true);
            if (next.priority === this.type) {
                // Find real versions of every model, if possible.
                var here = ctx.findVertical(null, this.idx);
                var nextV = ctx.findVertical(null, this.idx + 1);
                var combined = new Array(here.length);
                for (var i = 0; i < combined.length; ++i) {
                    if (!nextV[i].placeholder) {
                        combined[i] = nextV[i];
                    } else {
                        combined[i] = here[i];
                    }
                }
                for (var i = 0; i < ctx._voices.length; ++i) {
                    ctx._voices[i].body.splice(ctx.idx, 1);
                    ctx._voices[i].body[ctx.idx] = combined[i];
                }
                return this.retryStatus;
            } else if (next.isAttribute && next.priority < this.priority) {
                for (var i = 0; i < ctx._voices.length; ++i) {
                    var memo = ctx._voices[i].body[ctx.idx + 1];
                    ctx._voices[i].body[ctx.idx + 1] = ctx._voices[i].body[ctx.idx];
                    ctx._voices[i].body[ctx.idx] = memo;
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
    Proposed        	= 2 << 4,
    Engraved            = 2 << 5
    // Model-specific  >= 2 << 6
}

export = Model;
