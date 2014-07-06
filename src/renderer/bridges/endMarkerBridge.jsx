/**
 * A marker for the end of lines and bars.
 *
 * It's to help with positioning and other logic.
 * It is not rendered.
 *
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var assert = require("assert");
var _ = require("lodash");

class EndMarkerBridge extends Bridge {
    annotateImpl(ctx) {
        return true;
    }
    visible() {
        return false;
    }
    render() {
        return null;
    }
    toLylite(lylite) {
    }
}
EndMarkerBridge.prototype.prereqs = [
    [
        function(ctx) {
            var next = ctx.next();
            return !next || next.barline ||
                (ctx.body[ctx.idx + 2] &&
                    (ctx.body[ctx.idx + 2].newline ||
                    ctx.body[ctx.idx + 2].newpage)); },
        function(ctx) {
            var SongEditor = require("../../stores/songEditor.jsx");
            ctx.eraseCurrent();
            var visualCursor = SongEditor.visualCursor();
            if (visualCursor.endMarker && visualCursor.bar === ctx.bar) {
                visualCursor.bar++;
                visualCursor.beat = 1;
                visualCursor.endMarker = false;
            }
            return -1;
        },
        "End markers must only exist at the end of a line, document, or unfilled bar"
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
                var BarlineBridge = require("./barlineBridge.jsx");
                return BarlineBridge.createBarline(ctx, "double");
            }
        },
        "Double barlines terminate a piece."
    ]
];

module.exports = EndMarkerBridge;
