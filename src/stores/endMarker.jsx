/**
 * A marker for the end of lines and bars.
 *
 * It's to help with positioning and other logic.
 * It is not rendered.
 *
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var assert = require("assert");
var _ = require("lodash");

class EndMarkerModel extends Model {
    annotateImpl(ctx) {
        return true;
    }
    visible() {
        return false;
    }
    toLylite(lylite) {
    }
}
EndMarkerModel.prototype.prereqs = [
    [
        function(ctx) {
            var next = ctx.next();
            return !next || next.barline ||
                (ctx.body[ctx.idx + 2] &&
                    (ctx.body[ctx.idx + 2].newline ||
                    ctx.body[ctx.idx + 2].newpage)); },
        function(ctx) {
            var SongEditor = require("./songEditor.jsx");

            ctx.eraseCurrent();
            var visualCursor = SongEditor.visualCursor();
            if (visualCursor.endMarker && visualCursor.bar === ctx.bar) {
                visualCursor.bar++;
                visualCursor.beat = 1;
                visualCursor.endMarker = false;
            }
            return -1;
        },
        "End markers must only exist at the end of a line, document, or bar"
    ],
    [
        function(ctx) {
            return ctx.prev().barline || !ctx.beats ||
                ctx.beats >= 4/ctx.timeSignature.beatType * ctx.timeSignature.beats; },
        function(ctx) {
            // XXX: extend to work on things other than 4/4
            var DurationModel = require("./duration.jsx");
            var toAdd = ctx.timeSignature.beatType/ctx.timeSignature.beats*
                (ctx.timeSignature.beats - ctx.beats);

            var count;
            var dots = false;

            assert(toAdd < ctx.timeSignature.beats, "Don't run this on entirely blank bars!");
            var val = 2;
            for (var val = 2; val >= 0.015625; val /= 2) {
                if (toAdd === val*3/2) {
                    count = val;
                    dots = 1;
                    break;
                } else if (toAdd >= val) {
                    count = val;
                    break;
                }
            }
            return ctx.insertPast(new DurationModel({
                pitch: "r",
                count: parseInt(4/count)+"",
                dots: dots
            }));
        },
        "Bars must not be underfilled (should be filled with rests)"
    ],
    [
        function(ctx) {
            return ctx.next() || ctx.prev().barline === "double";
        },
        function(ctx) {
            if (ctx.prev().barline) {
                ctx.prev().barline = "double";
                return "line";
            } else {
                var BarlineModel = require("./barline.jsx");
                return BarlineModel.createBarline(ctx, "double");
            }
        },
        "Double barlines terminate a piece."
    ]
];

module.exports = EndMarkerModel;
