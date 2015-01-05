/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, December 2014
 */

import Model                = require("./model");

import _                    = require("lodash");
import assert               = require("assert");

import Annotator            = require("./annotator");
import C                    = require("./contracts");
import ClefModel            = require("./clef");
import KeySignatureModel    = require("./keySignature");
import TimeSignatureModel   = require("./timeSignature");

/**
 * Model representing a MusicXML attributes element.
 * http://www.musicxml.com/for-developers/musicxml-dtd/direction-elements/
 * 
 * Does not include data for clefs, time signatures, and key signatures, however
 * is responsible for their serialization.
 */
class AttributesModel extends Model implements C.MusicXML.AttributesComplete {
    ///////////////
    // I.1 Model //
    ///////////////

    get type()                          { return C.Type.Attributes; }
    get visible()                       { return false; }
    get xPolicy()                       { return C.RectifyXPolicy.Min; }

    get fields() {
        return [
            "divisions", "partSymbol", "measureStyle", "staffDetails", "transpose", "staves",
            "instruments", "directive", "footnote", "level"
        ];
    }

    get mxmlJsonOnlyFields() {
        return [
            "clefs", "time", "keySignature"
        ];
    }

    ///////////////////////////////
    // I.2 C.MusicXML.Attributes //
    ///////////////////////////////

    _parent:            C.MusicXML.Attributes;

    _divisions:         number;
    get divisions()     { return this._divisions === undefined && this._parent ? this._parent.divisions : this._divisions; }
    set divisions       (m: number) { this._divisions = m; }

    _partSymbol:        C.MusicXML.PartSymbol;
    get partSymbol()    { return this._partSymbol === undefined && this._parent ? this._parent.partSymbol : this._partSymbol; }
    set partSymbol      (m: C.MusicXML.PartSymbol) { this._partSymbol = m; }

    _measureStyle:      C.MusicXML.MeasureStyle;
    get measureStyle()  { return this._measureStyle === undefined && this._parent ? this._parent.measureStyle : this._measureStyle; }
    set measureStyle    (m: C.MusicXML.MeasureStyle) { this._measureStyle = m; }

    _staffDetails:      C.MusicXML.StaffDetails;
    get staffDetails()  { return this._staffDetails === undefined && this._parent ? this._parent.staffDetails : this._staffDetails; }
    set staffDetails    (m: C.MusicXML.StaffDetails) { this._staffDetails = m; }

    _transpose:         C.MusicXML.Transpose;
    get transpose()     { return this._transpose === undefined && this._parent ? this._parent.transpose : this._transpose; }
    set transpose       (m: C.MusicXML.Transpose) { this._transpose = m; }

    _staves:            number;
    get staves()        { return this._staves === undefined && this._parent ? this._parent.staves : this._staves; }
    set staves          (m: number) { this._staves = m; }

    _instruments:       string;
    get instruments()   { return this._instruments === undefined && this._parent ? this._parent.instruments : this._instruments; }
    set instruments     (m: string) { this._instruments = m; }

    _directive:         C.MusicXML.Directive;
    get directive()     { return this._directive === undefined && this._parent ? this._parent.directive : this._directive; }
    set directive       (m: C.MusicXML.Directive) { this._directive = m; }

    //////////////////////////////////////////////
    // I.3 C.MusicXML.Attributes, outside class //
    //////////////////////////////////////////////

    clefs:              C.MusicXML.Clef[];
    time:           	C.MusicXML.Time;
    keySignature:   	C.MusicXML.Key;

    //////////////////////////////
    // I.4 C.MusicXML.Editorial //
    //////////////////////////////

    footnote:           C.MusicXML.Footnote;
    level:          	C.MusicXML.Level;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    recordMetreDataImpl(mctx: C.MetreContext) {
        this._parent            = mctx.attributes;

        this.divisions          = this.divisions || (mctx.attributes && mctx.attributes.divisions) || 60; // ?
        mctx.attributes     	= this;
        this.ctxData        	= new C.MetreContext(mctx);
        if (this.time) {
            mctx.ts             = C.tsToSimpleTS(this.time);
        } else if (!mctx.ts) {
            // This will be corrected later.
            mctx.ts             = {
                beats:          4,
                beatType:       4
            };
        }
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        assert(this._parent !== this);
        ctx.attributes      	= this;

        var potentialParent = ctx.prev(c => c.type === C.Type.Attributes || c.type === C.Type.NewLine);
        var sameLineAsParent = this._parent && potentialParent === this._parent;
        if (this._parent && !sameLineAsParent) {
            this.time           = this.time || this._parent.time;
            this.keySignature   = null;
            this.clefs          = [];
            this.updateAttached(ctx);
        }

        if (this.time && !(this.time instanceof Model)) {
            ctx.insertFuture(new TimeSignatureModel(this.time, false));
            ctx.next().ctxData  = this.ctxData;
            this.time           = null;
        }
        if (this.keySignature && !(this.keySignature instanceof Model)) {
            ctx.insertFuture(new KeySignatureModel(this.keySignature, false));
            ctx.next().ctxData  = this.ctxData;
            this.keySignature   = null;
        }
        this.clefs = this.clefs || [];
        var clef = this.clefs[ctx.idxInPart];
        if (clef && !(clef instanceof Model)) {
            ctx.insertFuture(new ClefModel(clef, false));
            ctx.next().ctxData  = this.ctxData;
            clef                = null;
        }

        if (this._parent && sameLineAsParent) {
            this.updateAttached(ctx);
            this.time           = this.time || this._parent.time;
            this.keySignature   = this.keySignature || this._parent.keySignature;
            var clefs: C.MusicXML.Clef[] = [];
            for (var i = 0; i < Math.max(this.clefs.length, this._parent.clefs.length); ++i) {
                clefs[i] = this.clefs[i] || this._parent.clefs[i];
            }
            this.clefs = clefs;
        }
    
        if (!this._parent) {
            this.updateAttached(ctx);
        }

        return C.IterationStatus.Success;
    }

    toMXMLObject(): C.MusicXML.AttributesComplete {
        return C.JSONx.clone({
            clefs:              this.clefs,
            directive:      	this.directive,
            divisions:      	this.divisions,
            footnote:       	this.footnote,
            instruments:    	this.instruments,
            keySignature:   	this.keySignature,
            level:          	this.level,
            measureStyle:   	this.measureStyle,
            partSymbol:     	this.partSymbol,
            staffDetails:   	this.staffDetails,
            staves:         	this.staves,
            time:           	this.time,
            transpose:      	this.transpose
        });
    }

    ///////////////
    // III. Util //
    ///////////////

    updateAttached(ctx: Annotator.Context) {
        this.clefs          = this.clefs || [];
        this.clefs[ctx.idxInPart] = <any> ifAttribute(ctx.next(c => c.type === C.Type.Clef || c.type > C.Type.END_OF_ATTRIBUTES)) ||
            this.clefs[ctx.idxInPart];

        this.time           = <any> ifAttribute(ctx.next(c => c.priority === C.Type.TimeSignature || c.priority > C.Type.END_OF_ATTRIBUTES)) || this.time;
        this.keySignature   = <any> ifAttribute(ctx.next(c => c.priority === C.Type.KeySignature  || c.priority > C.Type.END_OF_ATTRIBUTES));

        function ifAttribute(m: Model) {
            return m && m.priority < C.Type.END_OF_ATTRIBUTES ? m : null;
        }
    }
}

module AttributesModel {
    "use strict";
    export class AttributesUndefinedException {
        // Pass
    }
}

export = AttributesModel;
