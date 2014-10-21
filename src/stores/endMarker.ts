/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import assert = require("assert");
import _ = require("lodash");

import Annotator = require("./annotator");
import BarlineModelType = require("./barline"); // Cyclic dependency. For types only.
import C = require("./contracts");
import DurationModelType = require("./duration"); // Cyclic dependency. For types only.
import Metre = require("./metre");

/**
 * A marker for the end of lines and bars. Its purpose is to help with
 * positioning and other logic. It is not rendered.
 */
class EndMarkerModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext({
            defaultCount: 4,
            timeSignature: mctx.timeSignature,
            beat: mctx.timeSignature.beats,
            bar: mctx.bar - 1,
            endMarker: true
        });
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        var next = ctx.next();
        var prev = ctx.prev();

        // End markers must not touch other end markers.
        if (next && next.type === C.Type.EndMarker || prev && prev.type === C.Type.EndMarker) {
            for (var i = ctx.idx; i >= 0; --i) {
                if (ctx.body[i].type === C.Type.NewLine) {
                    ctx.splice(i, 1);
                    ctx.markEntireSongDirty();
                    if (ctx.songEditor) {
                        ctx.songEditor.dangerouslyMarkRendererDirty();
                    }
                    return C.IterationStatus.RetryFromEntry;
                }
            }
            ctx.eraseCurrent();
            return C.IterationStatus.RetryLine;
        }

        // End markers must only exist at the end of a line, document, or bar
        if (next && next.priority !== C.Type.Barline &&
                (!ctx.body[ctx.idx + 2] ||
                (ctx.body[ctx.idx + 2].priority !== C.Type.NewLine &&
                ctx.body[ctx.idx + 2].priority !== C.Type.NewPage))) {
            ctx.eraseCurrent();

            return C.IterationStatus.RetryCurrent;
        }

        // Bars must not be under-filled (should be filled with rests)
        if (prev.type !== C.Type.Barline &&
                    ctx.beat && ctx.beat < ctx.timeSignature.beats) {
            // XXX: extend to work on things other than 4/4
            var beatsRemaining = ctx.timeSignature.beats - ctx.beat;

            assert(beatsRemaining < ctx.timeSignature.beats,
                "Don't run this on entirely blank bars!");

            var DurationModel: typeof DurationModelType = require("./duration");

            var toAdd = Metre.subtract(ctx.timeSignature.beats, ctx.beat, ctx)
                .map((beat: C.IPitchDuration) => {
                    beat.chord = [{ pitch: "r", octave: 0, acc: null }];
                    beat.tie = false;
                    return new DurationModel(beat, C.Source.Annotator);
                });

            ctx.splice(this.idx, 0, toAdd);

            return C.IterationStatus.RetryLine; // we really need a RETRY_BAR...
        }

        // Double barlines terminate a piece.
        if (!ctx.next() && (prev.type !== C.Type.Barline ||
            prev.barline !== C.Barline.Double)) {
            if (prev.type === C.Type.Barline) {
                prev.barline = C.Barline.Double;
                return C.IterationStatus.RetryLine;
            } else {
                var BarlineModel: typeof BarlineModelType = require("./barline");
                return BarlineModel.createBarline(ctx, C.Barline.Double);
            }
        }

        this.endMarker = true;

        return C.IterationStatus.Success;
    }
    visible() {
        return false;
    }
    toLylite(lylite: Array<string>) {
        // pass
    }
    get type() {
        return C.Type.EndMarker;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
        });
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = EndMarkerModel;
