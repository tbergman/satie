/**
 * A marker for the end of lines.
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
    ]
];

module.exports = EndMarkerBridge;
