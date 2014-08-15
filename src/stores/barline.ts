/**
 * @jsx React.DOM
 */

import Model = require("./model");

import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import DurationModel = require("./duration");
import EndMarkerModel = require("./endMarker");
import IterationStatus = require("./iterationStatus");
import KeySignatureModel = require("./keySignature");
import SmartCondition = require("./smartCondition");

class BarlineModel extends Model {
    onPianoStaff: boolean;
    newlineNext: boolean;
    annotatedAccidentalSpacing: number;
    height: number;
    yOffset: number;
    color: string;
    temporary: boolean;
    selected: boolean;

    annotateImpl(ctx: Context): IterationStatus {
        if (ctx.stave.pianoStaff) {
            this.onPianoStaff = true;
        };
        ctx.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        ctx.beats = 0;
        ++ctx.bar;
        ctx.renderKey_eInBar = {};
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);

        this.height = this.onPianoStaff ? 1.15 : 2/4;
        this.yOffset = this.onPianoStaff ? (2/4 - 1.15): 0;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");
        return IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        lylite.push("|");
    }

    static createBarline = (ctx: Context, mode?: any): IterationStatus => { // TSFIX
        mode = mode || true;

        if (ctx.curr().type === Contracts.ModelType.BEAM_GROUP) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                delete ctx.body[j].inBeam;
                if (ctx.body[j] === ctx.curr()) {
                    ctx.insertFuture(new BarlineModel({barline: mode}), j);
                    ++j;
                }
            }
            return IterationStatus.RETRY_LINE;
        }
        return ctx.insertPast(new BarlineModel({barline: mode}));
    };

    prereqs = BarlineModel.prereqs;
    static prereqs : Array<SmartCondition> = [
        {
            condition: function (ctx) {
                if (this.barline === "double") {
                    // Whether it actually can be a double barline is checked elsewhere.
                    return true;
                }
                for (var i = ctx.idx - 1; i >= 0 && ctx.body[i].type !==
                        Contracts.ModelType.NEWLINE; --i) {
                    if (ctx.body[i].isNote) {
                        return true;
                    }
                }
                return false;
            },
            correction: (ctx) => ctx.eraseCurrent(),
            description: "At least one note must exist before a barline on every line"
        },

        {
            condition: function(ctx: Context) {
                if (this.barline === "double") {
                    // Whether it actually can be a double barline is checked elsewhere.
                    return true;
                }
                for (var i = ctx.idx - 1; i >= 0 && ctx.body[i].type !==
                        Contracts.ModelType.BARLINE; --i) {
                    if (ctx.body[i].isNote || ctx.body[i].type ===
                            Contracts.ModelType.NEWLINE) {
                        return true;
                    }
                }
                return false;
            },
            correction: (ctx) => ctx.eraseCurrent(),
            description: "At least one note must exist between barlines"
        },

        {
            condition: function() { return false; },
            correction: function(ctx) {
                var next = ctx.next();
                this.newlineNext = (ctx.body.length > ctx.idx + 1) && (
                    next.type === Contracts.ModelType.NEWLINE ||
                    next.type === Contracts.ModelType.NEWPAGE);
                return IterationStatus.SUCCESS;
            },
            description: "Barlines followed by newlines do not have any right padding"
        },

        {
            condition: function() { return false; },
            correction: function(ctx) {
                if (ctx.next().isNote) {
                    // XXX: Also check that notes are on the same beat!
                    // e.g., | C/////
                    //       | C/C#// will add spacing, but it shouldn't!
                    this.annotatedAccidentalSpacing = 0.2*
                        (_.any(_.filter(ctx.next().intersects, (l: DurationModel) => l.isNote),
                            n => n.containsAccidental(ctx)) ? 1 : 0);
                } else {
                    this.annotatedAccidentalSpacing = 0;
                }
                return IterationStatus.SUCCESS;
            },
            description: "Barlines followed by accidentals have additional padding"
        },

        {
            condition: function(ctx) {
                return ctx.prev().endMarker; },
            correction: function (ctx) {
                return ctx.insertPast(new EndMarkerModel({ endMarker: true }));
            },
            description: "A barline must be preceeded by and endline marker"
        },

        {
            condition: function(ctx) {
                return this.barline !== "double" || !ctx.next(null, 2);
            },
            correction: function(ctx) {
                // It's no longer a double barline.
                this.barline = true;
                return IterationStatus.RETRY_CURRENT;
            },
            description: "Double barlines only exist at the end of a piece."
        }
    ];

    get type() {
        return Contracts.ModelType.BARLINE;
    }
}

Model.length; // BUG in typescriptifier

export = BarlineModel;
