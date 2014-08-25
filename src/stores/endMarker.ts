/**
 * @file A marker for the end of lines and bars. Its purpose is to help with
 * positioning and other logic. It is not rendered.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import assert = require("assert");
import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");
import Metre = require("./metre");

class EndMarkerModel extends Model {
    annotateImpl(ctx: Context): C.IterationStatus {
        // End markers must only exist at the end of a line, document, or bar
        var next = ctx.next();
        if (next && next.type !== C.Type.BARLINE &&
                (!ctx.body[ctx.idx + 2] ||
                (ctx.body[ctx.idx + 2].type !== C.Type.NEWLINE &&
                ctx.body[ctx.idx + 2].type !== C.Type.NEWPAGE))) {
            ctx.eraseCurrent();

            var SongEditor = require("./songEditor"); // Recursive dependency.
            var visualCursor = SongEditor.Instance.visualCursor();
            if (visualCursor.type === C.Type.END_MARKER && visualCursor.bar === ctx.bar) {
                visualCursor.bar++;
                visualCursor.beat = 1;
                visualCursor.endMarker = false;
            }
            return C.IterationStatus.RETRY_CURRENT;
        }

        // Bars must not be underfilled (should be filled with rests)
        if ( ctx.prev().type !== C.Type.BARLINE &&
                    ctx.beats && ctx.beats < ctx.timeSignature.beats) {
            // XXX: extend to work on things other than 4/4
            var beatsRemaining = ctx.timeSignature.beats - ctx.beats;

            assert(beatsRemaining < ctx.timeSignature.beats,
                "Don't run this on entirely blank bars!");

            var DurationModel = require("./duration"); // Recursive dependency.

            var toAdd = Metre.subtract(ctx.timeSignature.beats, ctx.beats, ctx)
                .map((beat: C.IPitchDuration) => new DurationModel(_.extend(beat, {
                    pitch: "r"})));
            Array.prototype.splice.apply(ctx.body,
                [this.idx, 0].concat(toAdd));

            return C.IterationStatus.RETRY_LINE; // we really need a RETRY_BAR...
        }

        // Double barlines terminate a piece.
        if (!ctx.next() && (ctx.prev().type !== C.Type.BARLINE ||
                ctx.prev().barline !== C.Barline.Double)) {
            if (ctx.prev().type === C.Type.BARLINE) {
                ctx.prev().barline = C.Barline.Double;
                return C.IterationStatus.RETRY_LINE;
            } else {
                var BarlineModel = require("./barline"); // Recursive dependency.
                return BarlineModel.createBarline(ctx, C.Barline.Double);
            }
        }

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
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = EndMarkerModel;
