/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import assert = require("assert");

import C = require("./contracts");
import Annotator = require("./annotator");
import Metre = require("./metre");

import _ = require("lodash");

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
        if (next && next.type === C.Type.END_MARKER || prev && prev.type === C.Type.END_MARKER) {
            for (var i = ctx.idx; i >= 0; --i) {
                if (ctx.body[i].type === C.Type.NEWLINE) {
                    ctx.splice(i, 1);
                    ctx.markEntireSongDirty();
                    if (ctx.songEditor) {
                        ctx.songEditor.dangerouslyMarkRendererDirty();
                    }
                    return C.IterationStatus.RETRY_FROM_ENTRY;
                }
            }
            ctx.eraseCurrent();
            return C.IterationStatus.RETRY_LINE;
        }

        // End markers must only exist at the end of a line, document, or bar
        if (next && next.priority !== C.Type.BARLINE &&
                (!ctx.body[ctx.idx + 2] ||
                (ctx.body[ctx.idx + 2].priority !== C.Type.NEWLINE &&
                ctx.body[ctx.idx + 2].priority !== C.Type.NEWPAGE))) {
            ctx.eraseCurrent();

            return C.IterationStatus.RETRY_CURRENT;
        }

        // Bars must not be under-filled (should be filled with rests)
        if (prev.type !== C.Type.BARLINE &&
                    ctx.beat && ctx.beat < ctx.timeSignature.beats) {
            // XXX: extend to work on things other than 4/4
            var beatsRemaining = ctx.timeSignature.beats - ctx.beat;

            assert(beatsRemaining < ctx.timeSignature.beats,
                "Don't run this on entirely blank bars!");

            var DurationModel = require("./duration"); // Recursive dependency.

            var toAdd = Metre.subtract(ctx.timeSignature.beats, ctx.beat, ctx)
                .map((beat: C.IPitchDuration) => {
                    beat.chord = [{ pitch: "r", octave: 0, acc: null }];
                    beat.tie = false;
                    return new DurationModel(beat, C.Source.ANNOTATOR);
                });

            ctx.splice(this.idx, 0, toAdd);

            return C.IterationStatus.RETRY_LINE; // we really need a RETRY_BAR...
        }

        // Double barlines terminate a piece.
        if (!ctx.next() && (prev.type !== C.Type.BARLINE ||
            prev.barline !== C.Barline.DOUBLE)) {
            if (prev.type === C.Type.BARLINE) {
                prev.barline = C.Barline.DOUBLE;
                return C.IterationStatus.RETRY_LINE;
            } else {
                var BarlineModel = require("./barline"); // Recursive dependency.
                return BarlineModel.createBarline(ctx, C.Barline.DOUBLE);
            }
        }

        this.endMarker = true;

        return C.IterationStatus.SUCCESS;
    }
    visible() {
        return false;
    }
    toLylite(lylite: Array<string>) {
        // pass
    }
    get type() {
        return C.Type.END_MARKER;
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
