/**
 * A marker for the end of lines and bars.
 *
 * It's to help with positioning and other logic.
 * It is not rendered.
 *
 * @jsx React.DOM
 */

import Model = require("./model");

import assert = require("assert");
import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import IterationStatus = require("./iterationStatus");
import Metre = require("./metre");
import SmartCondition = require("./smartCondition");

class EndMarkerModel extends Model {
    annotateImpl(ctx: Context): IterationStatus {
        return IterationStatus.SUCCESS;
    }
    visible() {
        return false;
    }
    toLylite(lylite: Array<string>) {
    }
    prereqs = EndMarkerModel.prereqs;
    static prereqs: Array<SmartCondition> = [
        {
            condition: function(ctx: Context): boolean {
                var next = ctx.next();
                return !next || next.type === Contracts.ModelType.BARLINE ||
                    (ctx.body[ctx.idx + 2] &&
                    (ctx.body[ctx.idx + 2].type === Contracts.ModelType.NEWLINE ||
                    ctx.body[ctx.idx + 2].type === Contracts.ModelType.NEWPAGE));
            },
            correction: function(ctx: Context): IterationStatus {
                ctx.eraseCurrent();

                var SongEditor = require("./songEditor"); // Recursive dependency.
                var visualCursor = SongEditor.Instance.visualCursor();
                if (visualCursor["endMarker"] && visualCursor.bar === ctx.bar) {
                    visualCursor.bar++;
                    visualCursor.beat = 1;
                    visualCursor["endMarker"] = false;
                }
                return IterationStatus.RETRY_CURRENT;
            },
            description: "End markers must only exist at the end of a line, document, or bar"
        },
        {
            condition: function (ctx: Context): boolean {
                return ctx.prev().type === Contracts.ModelType.BARLINE ||
                    !ctx.beats || ctx.beats >= ctx.timeSignature.beats; },
            correction: function(ctx: Context): IterationStatus {
                // XXX: extend to work on things other than 4/4
                var beatsRemaining = ctx.timeSignature.beats - ctx.beats;

                var count: number;
                var dots = false;

                assert(beatsRemaining < ctx.timeSignature.beats,
                    "Don't run this on entirely blank bars!");
                var val = 2;

                var DurationModel = require("./duration"); // Recursive dependency.

                var toAdd = Metre.subtract(ctx.timeSignature.beats, ctx.beats, ctx)
                    .map((beat: Contracts.PitchDuration) => new DurationModel(_.extend(beat, {
                        pitch: "r"})));
                Array.prototype.splice.apply(ctx.body,
                    [this.idx, 0].concat(toAdd));

                return IterationStatus.RETRY_CURRENT;
            },
            description: "Bars must not be underfilled (should be filled with rests)"
        },
        {
            condition: function(ctx: Context): boolean {
                // TSFIX
                return !!ctx.next() || (<any>ctx.prev())["barline"] === "double";
            },
            correction: function(ctx: Context): IterationStatus {
                if (ctx.prev().type === Contracts.ModelType.BARLINE) {
                    (<any>ctx.prev())["barline"] = "double"; // TSFIX
                    return IterationStatus.RETRY_LINE;
                } else {
                    var BarlineModel = require("./barline"); // Recursive dependency.
                    return BarlineModel.createBarline(ctx, "double");
                }
            },
            description: "Double barlines terminate a piece."
        }
    ];

    get type() {
        return Contracts.ModelType.END_MARKER;
    }
}

Model.length; // BUG in typescriptifier

export = EndMarkerModel;
