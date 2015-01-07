/**
 * @file The clef model is created by a ClefTool or another model to satisfy
 * a precondition and is read by the Clef view component.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model                    = require("./model");

import _                        = require("lodash");

import Annotator                = require("./annotator");
import AttributesModelType      = require("./attributes");  // Cyclic.
import BarlineModelType         = require("./barline");     // Cyclic.
import C                        = require("./contracts");

class ClefModel extends Model.SubAttributeModel implements C.MusicXML.ClefComplete {
    /* Model */
    get type()                                          { return C.Type.Clef; }
    get visible():              boolean                 { return this.isVisible !== false && !this.soundOnly; }
    get xPolicy()                                       { return C.RectifyXPolicy.Max; }

    get fields() {
        return [
            "isLocked",

            "clefOctaveChange", "sign", "number_", "size", "line", "afterBarline", "additional",
            "defaultX", "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle",
            "fontSize", "color", "printObject"
        ];
    }

    /* ClefModel */
    get displayedClef()                                 { return this._displayedClef || this; }
    set displayedClef(clef: C.MusicXML.ClefComplete)    { this._displayedClef = clef; }

    _annotatedSpacing:          number;
    isChange:                   boolean;
    isVisible:                  boolean;
    selected:                   boolean;
    get retryStatus()                                   { return C.IterationStatus.RetryLine; }
    private _displayedClef:     C.MusicXML.ClefComplete;

    /* Extensions */
    /** If false, it's a reminder rather than a change and shouldn't be saved in MusicXML */
    isLocked:                   boolean;

    /* C.MusicXML.Clef */
    clefOctaveChange:           string;
    sign:                       string;
    number_:                    number;
    size:                       C.MusicXML.SymbolSize;
    line:                       number;
    afterBarline:               boolean;
    additional:                 boolean;

    /* C.MusicXML.PrintStyle */

    /* C.MusicXML.PrintStyle >> Position */
    defaultX: number;
    relativeY: number;
    defaultY: number;
    relativeX: number;

    /* C.MusicXML.PrintStyle >> Font */
    fontFamily: string;
    fontWeight: C.MusicXML.NormalBold;
    fontStyle: C.MusicXML.NormalItalic;
    fontSize: string;

    /* C.MusicXML.PrintStyle >> Color */
    color: string;

    /* C.MusicXML.PrintObject */
    printObject: boolean;


    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: C.MusicXML.Clef, annotated: boolean) {
        super(spec, annotated);
        this.sign = this.sign.toUpperCase();
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Songs must have attributes to put the clef in.
        var AttributesModel: typeof AttributesModelType = require("./attributes");
        if (!(ctx.attributes instanceof AttributesModel)) {
            return ctx.insertPast(new AttributesModel({}, true));
        }

        // A clef must not be redundant.
        if (this._clefIsRedundant(ctx)) {
            ctx.eraseCurrent(Annotator.SplicePolicy.Masked);
            return C.IterationStatus.RetryLine; // BUG: Caching
        }

        this.sign = this.sign.toUpperCase();

        if (isNaN(this.line)) {
            for (var i = 0; i < ClefModel.standardClefs.length; ++i) {
                if (ClefModel.standardClefs[i].sign === this.sign) {
                    this.line = ClefModel.standardClefs[i].line;
                }
            }
        }

        // There must be at least one note or rest between clefs.
        for (var i = ctx.idx + 1; ctx.body[i] && !ctx.body[i].isNote; ++i) {
            if (ctx.body[i].type === C.Type.Clef) {
                return ctx.eraseCurrent(Annotator.SplicePolicy.MatchedOnly);
            }
        }

        // Clef changes at the beginning of a bar (ignoring rests) go BEFORE barlines.
        this.isChange = ctx.attributes.clefs[ctx.idxInPart] !== this;
        if (this.isChange) {
            // var barCandidate = ctx.prev(m => m.type === C.Type.Barline || m.isNote && !m.isRest);
            // if (barCandidate && barCandidate.type === C.Type.Barline) {
            //     ctx.insertPastVertical(ctx.findVertical(), barCandidate.idx - 1);
            //     for (var i = 0; i < ctx._voices.length; ++i) {
            //         ctx._voices[i].body.splice(ctx.idx, 1);
            //     }
            //     return C.IterationStatus.RetryLine;
            // }
        } else {
            // Otherwise, barlines should be before clefs when either is possible.
            if (ctx.ts && ctx.division >= ctx.ts.beats*ctx.attributes.divisions) {
                var BarlineModel: typeof BarlineModelType = require("./barline");
                return BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
            }
        }

        // Some clef lines don't NEED to be specified. Lets be flexible.
        if (isNaN(this.line)) {
            this.line = C.defaultClefLines[this.sign.toUpperCase()];
        }

        // Copy information from the context that the view needs.
        ctx.attributes.clefs = ctx.attributes.clefs || [];
        ctx.attributes.clefs[ctx.idxInPart] = this;
        var next = ctx.next();
        if (next.isNote) {
            var note: C.IPitch = <any> next;
            if (note.alter) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 15;
            } else {
                this._annotatedSpacing = 25;
            }
        } else {
            this._annotatedSpacing = 12.5;
        }
        if (this.isChange) {
            ctx.x += 4.2 + this._annotatedSpacing;
        } else {
            ctx.x += 24 + this._annotatedSpacing;
        }
        this.color = this.displayedClef !== this ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.Success;
    }

    /* Convenience */
    private _clefIsRedundant(ctx: Annotator.Context): boolean {
        var possiblePrevClef = ctx.prev(c => c.priority === C.Type.Clef || c.priority === C.Type.NewLine);
        var prevClef: C.MusicXML.Clef = possiblePrevClef && possiblePrevClef.type === C.Type.Clef ? <any> possiblePrevClef : null;
        if (!prevClef || prevClef === this) {
            return false;
        }
        if (_.isEqual(JSON.parse(ClefModel.serializeClef(prevClef)), JSON.parse(ClefModel.serializeClef(this)))) {
            return true;
        }

        return false;
    }

    /* Static */
    static createClef = function (ctx: Annotator.Context): C.IterationStatus {
        var clef: C.MusicXML.Clef = <any> ctx.prev(c => c.type === C.Type.Clef) ||
            {
                sign: "G",
                line: 2
            };
        var model = new ClefModel(clef, true);
        model.ctxData = ctx.curr.ctxData;
        ctx.insertPast(model);
        return C.IterationStatus.RetryLine; // Caching
    };

    static standardClefs: C.MusicXML.ClefComplete[] = [
        {
            // Treble
            line:               2,
            sign:              	"G",
            additional:        	false,
            afterBarline:      	false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:           16,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number_:            1,
            printObject:        true,
            relativeX:          0,
            relativeY: 			0,
            size:               1
        }, {
            // bass
            line:               4,
            sign: 				"F",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY: 			4,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number_:            1,
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
            defaultY: 			0,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number_:            1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }, {
            // alto
            line:               4,
            sign: 				"C",
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
            number_:            1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }
    ];
}

module ClefModel {
    "use strict";
    export function serializeClef(c: C.MusicXML.Clef) {
        return JSON.stringify({
            additional:         c.additional || false,
            size:               c.sign,
            number_:            c.number_,
            line:               c.line
        });
    }
}

export = ClefModel;
