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
            return !stave.body[idx + 1] || (stave.body[idx + 2] &&
                (stave.body[idx + 2].newline ||
                    stave.body[idx +2].newpage)); },
        function(cursor, stave, idx) {
            stave.body.splice(idx, 1);
            return -1;
        },
        "End markers must only exist at the end of a line or document"
    ]
];

module.exports = EndMarkerBridge;
