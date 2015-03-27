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

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("./engine");

class AttributesModel implements Export.IAttributesModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    get fields(): string[] {
        var isChangedHere = (prop: string) => {
            return ("_" + prop) in this;
        };

        return _.filter(
            [
                "divisions",
                "partSymbol",
                "measureStyle",
                "staffDetails",
                "transposes",
                "staves",
                "instruments",
                "directives",
                "clefs",
                "times",
                "keySignatures",
                "footnote",
                "level"
            ], isChangedHere);
    }

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        this._parent            = cursor$.staff.attributes;

        invariant(this._parent !== this, "Internal error. " +
            "AttributesModel.validate$() must not be called in a context with itself as a parent!");
        invariant(!!this.divisions, "Internal error. " +
            "AttributesModel.validate$() requires divisions to be set already.");

        cursor$.staff.attributes = this;

        // Defaults

        this._validateClef$(cursor$);
        this._validateTime$();
        this._validateKey$();

        this._setTotalDivisions(cursor$);
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        cursor$.staff.attributes = this;

        this._setTotalDivisions(cursor$);

        // mutates cursor$ as required.
        return new AttributesModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Attributes ------------------------------------------------------------*/

    _parent:            MusicXML.Attributes;

    _divisions:         number;
    get divisions()     { return this._divisions === undefined && this._parent ? this._parent.divisions : this._divisions; }
    set divisions       (m: number) { this._divisions = m; }

    _partSymbol:        MusicXML.PartSymbol;
    get partSymbol()    { return this._partSymbol === undefined && this._parent ? this._parent.partSymbol : this._partSymbol; }
    set partSymbol      (m: MusicXML.PartSymbol) { this._partSymbol = m; }

    _measureStyle:      MusicXML.MeasureStyle;
    get measureStyle()  { return this._measureStyle; }
    set measureStyle    (m: MusicXML.MeasureStyle) { this._measureStyle = m; }

    _staffDetails:      MusicXML.StaffDetails[];
    get staffDetails()  { return this._staffDetails === undefined && this._parent ? this._parent.staffDetails : this._staffDetails; }
    set staffDetails    (m: MusicXML.StaffDetails[]) { this._staffDetails = m; }

    _transposes:        MusicXML.Transpose[];
    get transposes()    { return this._transposes === undefined && this._parent ? this._parent.transposes : this._transposes; }
    set transposes      (m: MusicXML.Transpose[]) { this._transposes = m; }

    _staves:            number;
    get staves()        { return this._staves === undefined && this._parent ? this._parent.staves : this._staves; }
    set staves          (m: number) { this._staves = m; }

    _instruments:       string;
    get instruments()   { return this._instruments === undefined && this._parent ? this._parent.instruments : this._instruments; }
    set instruments     (m: string) { this._instruments = m; }

    _directives:        MusicXML.Directive[];
    get directives()    { return this._directives === undefined && this._parent ? this._parent.directives : this._directives; }
    set directives      (m: MusicXML.Directive[]) { this._directives = m; }

    _clefs:             MusicXML.Clef[];
    get clefs()         { return this._clefs === undefined && this._parent ? this._parent.clefs : this._clefs; }
    set clefs           (m: MusicXML.Clef[]) { this._clefs = m; }

    _times:             MusicXML.Time[];
    get times()         { return this._times === undefined && this._parent ? this._parent.times : this._times; }
    set times           (m: MusicXML.Time[]) { this._times = m; }

    _keySignatures:     MusicXML.Key[];
    get keySignatures() { return this._keySignatures === undefined && this._parent ? this._parent.keySignatures : this._keySignatures; }
    set keySignatures   (m: MusicXML.Key[]) { this._keySignatures = m; }

    /*---- I.3 C.MusicXML.Editorial -------------------------------------------------------------*/

    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: MusicXML.Attributes) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.attributesToXML(this);
    }

    inspect() {
        return this.toXML();
    }

    private _validateClef$(cursor$: Engine.ICursor) {
        const staffIdx = cursor$.staff.idx;

        // clefs must be an array
        if (!this.clefs) {
            this.clefs = [];
        }

        // A clef is mandatory so far
        if (!this.clefs[staffIdx]) {
            this.clefs[staffIdx] = {
                sign: "G",
                line: 2,
                clefOctaveChange: null
            };
        }

        let clef = this.clefs[staffIdx];

        // Clef signs are normalized to be uppercase.
        if (clef) {
            clef.sign = clef.sign.toUpperCase();
        }

        // Clef lines can be inferred if needed.
        if (isNaN(clef.line)) {
            clef.line = (
                    _.find(Export.Clef.standardClefs,
                        clef => clef.sign === clef.sign) ||
                    { line: 2 } // fallback on treble clef
                ).line;
        }

        var parentClef = this._parent && this._parent.clefs && this._parent.clefs.length ?
            this._parent.clefs[staffIdx] : null;

        var thisClef = clef;
        if (parentClef && parentClef.sign === thisClef.sign && parentClef.line === thisClef.line &&
                parentClef.clefOctaveChange === thisClef.clefOctaveChange) {
            // Clef is redundant
            delete this._clefs;
        }
    }

    private _validateTime$() {
        if (!this.times) {
            // A time signature is mandatory.

            this.times = <MusicXML.Time[]> [{
                beats: ["4"],
                beatTypes: [4],
                senzaMisura: null
            }];
        } else if (!!this._times && this._times.length) {
            var parentTime = this._parent ? this._parent.times[0] : null;
            _.forEach(this.times[0].beats, function(beat) {
                invariant(typeof beat === "string", "Attributes validation error: beats must " +
                    "be strings, but %s is not a string", beat);
            });
            if (parentTime && JSON.stringify(this.times[0].beats) === JSON.stringify(parentTime.beats) &&
                    JSON.stringify(this.times[0].beatTypes) === JSON.stringify(parentTime.beatTypes) &&
                    !!this.times[0].senzaMisura === !!parentTime.senzaMisura &&
                    this.times[0].symbol === this.times[0].symbol) {
                // TS is redundant
                delete this._times;
            }
        }
    }

    private _validateKey$() {
        if (!this.keySignatures || !this.keySignatures.length) {
            // A key signature is mandatory.

            this.keySignatures = [{
                fifths: 0,
                keySteps: null,
                keyAccidentals: null,
                keyAlters: null
            }];
        } else if (!!this._keySignatures && this._keySignatures.length) {
            var parentKS = this._parent ? this._parent.keySignatures[0] : null;
            if (parentKS && this.keySignatures[0].fifths === parentKS.fifths &&
                    this.keySignatures[0].keySteps === parentKS.keySteps &&
                    this.keySignatures[0].keyAccidentals === parentKS.keyAccidentals &&
                    this.keySignatures[0].keyAlters === parentKS.keyAlters &&
                    this.keySignatures[0].mode === parentKS.mode) {
                // Key signature is redundant
                delete this._keySignatures;
            }
        }
    }

    _setTotalDivisions(cursor$: Engine.ICursor): void {
        invariant(!!this.divisions, "Expected divisions to be set before calculating bar divisions.");

        var time = this.times[0];

        var totalBeats = _.reduce(time.beats, (memo, time) => memo +
            _.reduce(time.split("+"), (memo, time) => memo + parseInt(time, 10), 0), 0);

        cursor$.staff.totalDivisions = totalBeats * this.divisions || NaN;
    }
}

AttributesModel.prototype.divCount = 0;
AttributesModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module AttributesModel {
    export class Layout implements Export.ILayout {
        constructor(model: AttributesModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.staffIdx = cursor$.staff.idx;

            var isFirstInLine = cursor$.line && cursor$.line.barOnLine === 0;
            var next = Engine.ICursor.next(cursor$);
            var nextIsNote = cursor$.factory.modelHasType(next, Engine.IModel.Type.Chord);

            this.ksVisible = !!model._keySignatures && !!model._keySignatures.length || isFirstInLine;
            this.tsVisible = !!model._times && !!model._times.length; // TODO: || isFirstInPage;
            this.clefVisible = !!model._clefs && !!model._clefs.length || isFirstInLine;

            /*---- Clef layout ------------------------------------*/

            if (this.clefVisible) {
                var contextualSpacing = 0;
                model._clefs[this.staffIdx].size = isFirstInLine ? MusicXML.SymbolSize.Full : MusicXML.SymbolSize.Cue;

                if (nextIsNote && !this.ksVisible && !this.tsVisible) {
                    var chord = Engine.IChord.fromModel(next);
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 15;
                    } else {
                        contextualSpacing = 25;
                    }
                } else {
                    contextualSpacing = 12.5;
                }

                if (!isFirstInLine) {
                    this.clefSpacing = 4.2 + contextualSpacing;
                } else {
                    this.clefSpacing = 24 + contextualSpacing;
                }
            } else {
                this.clefSpacing = 0;
            }

            /*---- KS layout --------------------------------------*/

            if (this.ksVisible) {
                var contextualSpacing = 0;
                if (nextIsNote && !this.tsVisible) {
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    } else {
                        contextualSpacing = 15;
                    }
                } else {
                    contextualSpacing = 10;
                }

                var keySignature = model.keySignatures[0];

                var fifths: number = Math.min(7, Math.abs(keySignature.fifths));
                if (fifths) {
                    this.ksSpacing = contextualSpacing + 10.4 * fifths;
                } else {
                    this.ksSpacing = contextualSpacing - 5;
                }
            } else {
                this.ksSpacing = 0;
            }

            /*---- TS layout --------------------------------------*/

            if (this.tsVisible) {
                var contextualSpacing = 0;
                if (nextIsNote) {
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    } else {
                        contextualSpacing = 15;
                    }
                } else {
                    contextualSpacing = 12.5;
                }

                this.tsSpacing = 28 + contextualSpacing;
            } else {
                this.tsSpacing = 0;
            }

            /*---- Geometry ---------------------------------------*/

            cursor$.x$ += this.clefSpacing + this.tsSpacing + this.ksSpacing;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: AttributesModel;
        x$: number;
        division: number;
        staffIdx: number;

        // Prototype:

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass: Engine.IModel.Type;
        expandable: boolean;

        /*---- AttributesModel ----------------------------------------------*/

        clefVisible: boolean;
        clefSpacing: number;

        tsVisible: boolean;
        tsSpacing: number;

        ksVisible: boolean;
        ksSpacing: number;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = false;
    Layout.prototype.renderClass = Engine.IModel.Type.Attributes;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Attributes in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Attributes] = AttributesModel;
}

module Export {
    export interface IAttributesModel extends Engine.IModel, MusicXML.Attributes {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: IAttributesModel;

        clefVisible: boolean;
        clefSpacing: number;

        tsVisible: boolean;
        tsSpacing: number;

        ksVisible: boolean;
        ksSpacing: number;

        staffIdx: number;
    }

    export module Clef {
        export var standardClefs: MusicXML.Clef[] = [
            {
                // Treble
                line:               2,
                sign:               "G",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           16,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // bass
                line:               4,
                sign:               "F",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:             4,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // tenor
                line:               3,
                sign:               "C",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:             0,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // alto
                line:               4,
                sign:               "C",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           8,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }
        ];
    }
}

export = Export;