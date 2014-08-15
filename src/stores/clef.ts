/**
 * The ClefModel is read by the Clef component and written by a ClefTool or
 * by another Model to satsify a precondition.
 *
 * The Ripieno Project
 * (C) Josh Netterfield 2014.
 */

import Model = require("./model");

import BeginModel = require("./begin");
import Context = require("./context");
import Contracts = require("./contracts");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");

class ClefModel extends Model {
    isChange: boolean;
    clefName: string;
    clef: string;
    _annotatedSpacing: number;
    color: string;
    isVisible: boolean;
    temporary: boolean;
    selected: boolean;

    annotateImpl(ctx: Context): IterationStatus {
        this.isChange = !!ctx.clef;
        this.clefName = ctx.clef = (this.clef === "detect") ? ctx.prevClef : this.clef;
        var next = ctx.next();
        if (next.isNote) {
            var note: Contracts.Pitch = <any> next;
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
            ctx.x += -0.01 + this._annotatedSpacing / 4;
        } else {
            ctx.x += 0.6 + this._annotatedSpacing/4;
        }
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return IterationStatus.SUCCESS;
    }
    visible(): boolean {
        return this.isVisible !== false;
    }
    toLylite(lylite: Array<string>) {
        if (this["_annotated"]) {
            return;
        }
        lylite.push("\\clef " + this.clef + "\n");
    }
    static clefIsNotRedundant = function (ctx: Context): boolean {
        // XXX HACK {
        if (false === this.isVisible) {
            return true;
        }
        // }
        return this.temporary ||
            ctx.clef !== this.clef ||
            this.clef === "detect";
    };

    static createClef = function (ctx: Context): IterationStatus {
        return ctx.insertPast(new ClefModel({
            clef: (ctx.prevClef ? "detect" : "treble"),
            _annotated: "createClef"
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

    static clefToLine = {
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

    prereqs = ClefModel.prereqs;
    static prereqs: Array<SmartCondition> = [
        {
            condition: ClefModel.clefIsNotRedundant,
            correction: (ctx) => ctx.eraseCurrent(),
            description: "A clef must not be redundant."
        },
        {
            condition: function(ctx) {
                return ctx.idx !== 0; },
            correction: function(ctx) {
                return BeginModel.createBegin(ctx);
            },
            description: "Songs begin with BeginModels."
        },
        {
            condition: function(ctx) {
                return !ctx.timeSignature || ctx.beats < ctx.timeSignature.beats; },
            correction: function(ctx) {
                var BarlineModel = require("./barline"); // Recursive dependency.
                return BarlineModel.createBarline(ctx);
            },
            description: "Barlines should be before clefs when either is possible"
        }
    ];

    get type() {
        return Contracts.ModelType.CLEF;
    }
}

Model.length; // BUG in typescriptifier

export = ClefModel;
