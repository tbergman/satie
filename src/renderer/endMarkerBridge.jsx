/**
 * A marker for the end of lines.
 *
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var assert = require("assert");
var _ = require("underscore");

class EndMarkerBridge extends Bridge {
    prereqs() {
        return [
            [
                (obj, cursor, stave, idx) => !stave.body[idx + 1] || (stave.body[idx + 2] &&
                        (stave.body[idx + 2].newline || stave.body[idx +2].newpage)),
                (obj, cursor, stave, idx) => {
                    stave.body.splice(idx, 1);
                    return -1;
                },
                "End markers must only exist at the end of a line or document"
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        return true;
    }
    visible() {
        return false;
    }
    render(obj, engine) {
        return null;
    }
    toLylite(obj, lylite) {
    }
}

module.exports = EndMarkerBridge;
