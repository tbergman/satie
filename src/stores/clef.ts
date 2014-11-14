/**
 * @file The clef model is created by a ClefTool or another model to satisfy
 * a precondition and is read by the Clef view component.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import Annotator = require("./annotator");
import BarlineModelType = require("./barline"); // Cyclic dependency. For types only.
import BeginModel = require("./begin");
import C = require("./contracts");

import _ = require("lodash");

class ClefModel extends Model.StateChangeModel {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Songs begin with BeginModels.
        if (ctx.idx === 0) {
            return BeginModel.createBegin(ctx);
        }

        // A clef must not be redundant.
        if (this.clefIsRedundant(ctx)) {
            ctx.eraseCurrent(Annotator.SplicePolicy.Masked);
            return C.IterationStatus.RetryLine; // BUG: Caching
        }

        // There must be at least one note or rest between clefs.
        for (var i = ctx.idx + 1; ctx.body[i] && !ctx.body[i].isNote; ++i) {
            if (ctx.body[i].type === C.Type.Clef) {
                this.clef = (<ClefModel>ctx.body[i]).clef;
                break;
            }
        }

        // Clef changes at the beginning of a bar (ignoring rests) go BEFORE barlines.
        this.isChange = !!ctx.clef;
        if (this.isChange) {
            var barCandidate = ctx.prev(m => m.type === C.Type.Barline || m.isNote && !m.isRest);
            if (barCandidate && barCandidate.type === C.Type.Barline) {
                ctx.insertPastVertical(ctx.findVertical(), barCandidate.idx - 1);
                for (var i = 0; i < ctx._parts.length; ++i) {
                    ctx._parts[i].body.splice(ctx.idx, 1);
                }
                return C.IterationStatus.RetryLine;
            }
        } else {
            // Otherwise, barlines should be before clefs when either is possible.
            if (ctx.timeSignature && ctx.beat >= ctx.timeSignature.beats) {
                var BarlineModel: typeof BarlineModelType = require("./barline");
                return BarlineModel.createBarline(ctx, C.Barline.Standard);
            }
        }

        // Copy information from the context that the view needs.
        this.displayedClefName = (this.clef === "detect" && this.displayedClef === this.clef) ?
            ctx.prevClefByStave[ctx.currStaveIdx] : this.displayedClef;
        ctx.clef = this.clef === "detect" ? ctx.prevClefByStave[ctx.currStaveIdx] : this.clef;
        var next = ctx.next();
        if (next.isNote) {
            var note: C.IPitch = <any> next;
            if (note.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }
        if (this.isChange) {
            ctx.x += 0.21 + this._annotatedSpacing / 4;
        } else {
            ctx.x += 0.6 + this._annotatedSpacing/4;
        }
        this.color = this.displayedClef !== this.clef ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.Success;
    }
    visible(): boolean {
        return this.isVisible !== false;
    }
    toLylite(lylite: Array<string>) {
        if (this.source === C.Source.Annotator) {
            return;
        }
        lylite.push("\\clef " + this.clef + "\n");
    }
    clefIsRedundant(ctx: Annotator.Context): boolean {
        return ctx.clef === this.clef && this.clef !== "detect";
    }

    static createClef = function (ctx: Annotator.Context): C.IterationStatus {
        return ctx.insertPast(new ClefModel({
            clef: (ctx.prevClefByStave[ctx.currStaveIdx] ? "detect" : "treble"),
            source: C.Source.Annotator
        }));
    };

    static standardClefs = [
        {
            name: "treble",
            glyph: "gClef",
            x: -0.4,
            y: 0.4
        }, {
            name: "bass",
            glyph: "fClef",
            x: -0.4,
            y: 0.1
        }, {
            name: "tenor",
            glyph: "cClef",
            x: -0.4,
            y: 0.0
        }, {
            name: "alto",
            glyph: "cClef",
            x: -0.4,
            y: 0.2
        }
    ];

    static clefToLine: { [key:string]: number } = {
        "treble": 2,
        "gClef15mb": 2,
        "gClef8vb": 2,
        "gClef8va": 2,
        "gClef15ma": 2,
        "gClef8vbOld": 2,
        "gClef8vbCClef": 2,
        "gClef8vbParens": 2,
        "gClefArrowUp": 2,
        "gClefArrowDown": 2,

        "alto": 3,
        "tenor": 4,
        "cClef8vb": 3,
        "cClefArrowUp": 3,
        "cClefArrowDown": 3,
        "cClefSquare": 3,
        "cClefCombining": 3,

        "bass": 4,
        "fClef15mb": 4,
        "fClef8vb": 4,
        "fClef8va": 4,
        "fClef15ma": 4,
        "fClefArrowUp": 4,
        "fClefArrowDown": 4,

        "unpitchedPercussionClef1": 3,
        "unpitchedPercussionClef2": 3,
        "semipitchedPercussionClef1": 3,
        "semipitchedPercussionClef2": 3,

        "6stringTabClef": 3,
        "4stringTabClef": 3,
        "cClefTriangular": 3,
        "fClefTriangular": 3,
        "cClefTriangularToFClef": 3,
        "fClefTriangularToCClef": 3,
        "gClefReversed": 2,
        "gClefTurned": 2,
        "cClefReversed": 3,
        "fClefReversed": 4,
        "fClefTurned": 4,
        "bridgeClef": 3,
        "accdnDiatonicClef":3,

        "soprano": 1,
        "mezzosoprano": 2,
        "baritone": 5,
        "french": 1
    };

    get type() {
        return C.Type.Clef;
    }

    get displayedClef() {
        return this._displayedClef || this.clef;
    }

    set displayedClef(clef: string) {
        this._displayedClef = clef;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            clef: this.clef,
            displayedClefName: this.displayedClefName,
            visible: this.visible
        });
    }

    _annotatedSpacing: number;
    clef: string;
    displayedClefName: string;
    color: string;
    isChange: boolean;
    isVisible: boolean;
    selected: boolean;
    retryStatus = C.IterationStatus.RetryLine;
    private _displayedClef: string;
}

export = ClefModel;
