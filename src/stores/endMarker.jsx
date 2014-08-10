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
var Metre = require("ripienoUtil/metre.jsx");

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
                ctx.beats >= ctx.timeSignature.beats; },
        function(ctx) {
            // XXX: extend to work on things other than 4/4
            var DurationModel = require("./duration.jsx");
            var beatsRemaining = ctx.timeSignature.beats - ctx.beats;

            var count;
            var dots = false;

            assert(beatsRemaining < ctx.timeSignature.beats,
                   "Don't run this on entirely blank bars!");
            var val = 2;


            var toAdd = Metre.subtract(
                    ctx.timeSignature.beats,
                    ctx.beats,
                    ctx.timeSignature,
                    ctx.beats)
                .map(beat => new DurationModel(_.extend(beat, {
                    pitch: "r"})));
            Array.prototype.splice.apply(ctx.body,
                [this.idx, 0].concat(toAdd));

            return -1;
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
