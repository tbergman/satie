/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

var Barline = require("../primitives/barline.jsx");
var EndMarkerBridge = require("./endMarkerBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");

class BarlineBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
        if (stave.pianoStaff) {
            this.onPianoStaff = true;
        };
        cursor.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        cursor.beats = 0;
        ++cursor.bar;
        cursor.renderKey_eInBar = {};
        cursor.accidentals = KeySignatureBridge.getAccidentals(cursor.keySignature);
        return true;
    }
    render() {
        return <Barline
            barline={this.barline}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : null)}
            key={this.key()}
            height={this.onPianoStaff ? 1.15 : 2/4}
            x={this.x()}
            y={this.y() + (this.onPianoStaff ? 1.3/2 : 0)} />;
    }
    toLylite(lylite) {
        lylite.push("|");
    }
}

BarlineBridge.prototype.prereqs = [
    [
        function (cursor, stave, idx) {
            if (this.barline === "double") {
                // Whether it actually can be a double barline is checked elsewhere.
                return true;
            }
            for (var i = idx - 1; i >= 0 && !stave.body[i].newline; --i) {
                if (stave.body[i].pitch || stave.body[i].chord) {
                    return true;
                }
            }
            return false;
        },
        function(cursor, stave, idx) {
            stave.body.splice(idx, 1);
            return -1;
        },
        "At least one note must exist before a barline on every line"
    ],

    [
        function(cursor, stave, idx) {
            if (this.barline === "double") {
                // Whether it actually can be a double barline is checked elsewhere.
                return true;
            }
            for (var i = idx - 1; i >= 0 && !stave.body[i].barline; --i) {
                if (stave.body[i].pitch || stave.body[i].chord || stave.body[i].newline) {
                    return true;
                }
            }
            return false;
        },
        function(cursor, stave, idx) {
            stave.body.splice(idx, 1);
            return -1;
        },
        "At least one note must exist between barlines"
    ],

    [
        function() { return false; },
        function(cursor, stave, idx) {
            this.newlineNext = (stave.body.length > idx + 1) &&
                (stave.body[idx + 1].newline || stave.body[idx + 1].newpage);
            return true;
        },
        "Barlines followed by newlines do not have any right padding"
    ],

    [
        function() { return false; },
        function(cursor, stave, idx) {
            var next = this.next(stave, idx);
            var PitchBridge = require("./pitchBridge.jsx");
            if (next instanceof PitchBridge && next.containsAccidental(cursor)) {
                this.annotatedAccidentalSpacing = 0.4;
            } else {
                this.annotatedAccidentalSpacing = 0;
            }
            return true;
        },
        "Barlines followed by newlines have additional padding"
    ],

    [
        function(cursor, stave, idx) {
            return stave.body[idx - 1].endMarker; },
        function(cursor, stave, idx) {
            stave.body.splice(idx, 0,
                new EndMarkerBridge({endMarker: true}));
            return -1;
        },
        "If followed by a newline or underfilled, must be preceeded by and endline marker"
    ],

    [
        function(cursor, stave, idx) {
            return this.barline !== "double" || !stave.body[idx + 2];
        },
        function(cursor, stave, idx) {
            // It's no longer a double barline.
            this.barline = true;
            return -1;
        },
        "Double barlines only exist at the end of a piece."
    ]
];

var createBarline = (cursor, stave, idx, mode) => {
    mode = mode || true;

    if (stave.body[idx].beam) {
        stave.body.splice(idx, 1);
        for (var j = idx; j < stave.body.length && stave.body[j].inBeam; ++j) {
            delete stave.body[j].inBeam;
            if (stave.body[j] === this) {
                stave.body.splice(j, 0, {barline: mode});
                ++j;
            }
        }
        return "line";
    }
    stave.body.splice(idx, 0, new BarlineBridge({barline: mode}));
    return -1;
};

module.exports = BarlineBridge;
module.exports.createBarline = createBarline;
