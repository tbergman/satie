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
var _ = require("underscore");

class EndMarkerBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
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
        function(cursor, stave, idx) {
            return !stave.body[idx + 1] ||
                stave.body[idx + 1].barline ||
                (stave.body[idx + 2] &&
                    (stave.body[idx + 2].newline ||
                    stave.body[idx +2].newpage)); },
        function(cursor, stave, idx) {
            var SongEditor = require("../../stores/songEditor.jsx");
            stave.body.splice(idx, 1);
            var visualCursor = SongEditor.visualCursor();
            if (visualCursor.endMarker && visualCursor.bar === cursor.bar) {
                visualCursor.bar++;
                visualCursor.beat = 1;
                visualCursor.endMarker = false;
            }
            return -1;
        },
        "End markers must only exist at the end of a line, document, or unfilled bar"
    ],
    [
        function(cursor, stave, idx) {
            return stave.body[idx + 1] || stave.body[idx - 1].barline === "double";
        },
        function(cursor, stave, idx) {
            if (stave.body[idx - 1].barline) {
                stave.body[idx - 1].barline = "double";
                return "line";
            } else {
                var BarlineBridge = require("./barlineBridge.jsx");
                return BarlineBridge.createBarline(cursor, stave, idx, "double");
            }
        },
        "Double barlines terminate a piece."
    ]
];

module.exports = EndMarkerBridge;
