/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

var Barline = require("../primitives/barline.jsx");
var EndMarkerBridge = require("./endMarkerBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");

class BarlineBridge extends Bridge {
    annotateImpl(ctx) {
        if (ctx.stave.pianoStaff) {
            this.onPianoStaff = true;
        };
        ctx.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        ctx.beats = 0;
        ++ctx.bar;
        ctx.renderKey_eInBar = {};
        ctx.accidentals = KeySignatureBridge.getAccidentals(ctx.keySignature);
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
        function (ctx) {
            if (this.barline === "double") {
                // Whether it actually can be a double barline is checked elsewhere.
                return true;
            }
            for (var i = ctx.idx - 1; i >= 0 && !ctx.body[i].newline; --i) {
                if (ctx.body[i].pitch || ctx.body[i].chord) {
                    return true;
                }
            }
            return false;
        },
        (ctx) => ctx.eraseCurrent(),
        "At least one note must exist before a barline on every line"
    ],

    [
        function(ctx) {
            if (this.barline === "double") {
                // Whether it actually can be a double barline is checked elsewhere.
                return true;
            }
            for (var i = ctx.idx - 1; i >= 0 && !ctx.body[i].barline; --i) {
                if (ctx.body[i].pitch || ctx.body[i].chord || ctx.body[i].newline) {
                    return true;
                }
            }
            return false;
        },
        (ctx) => ctx.eraseCurrent(),
        "At least one note must exist between barlines"
    ],

    [
        function() { return false; },
        function(ctx) {
            var next = ctx.next();
            this.newlineNext = (ctx.body.length > ctx.idx + 1) &&
                (next.newline || next.newpage);
            return true;
        },
        "Barlines followed by newlines do not have any right padding"
    ],

    [
        function() { return false; },
        function(ctx) {
            var next = ctx.next();
            var PitchBridge = require("./pitchBridge.jsx");
            if (next instanceof PitchBridge && next.containsAccidental(ctx)) {
                this.annotatedAccidentalSpacing = 0.4;
            } else {
                this.annotatedAccidentalSpacing = 0;
            }
            return true;
        },
        "Barlines followed by newlines have additional padding"
    ],

    [
        function(ctx) {
            return ctx.prev().endMarker; },
        function(ctx) {
            return ctx.insertBefore(new EndMarkerBridge({endMarker: true}));
        },
        "If followed by a newline or underfilled, must be preceeded by and endline marker"
    ],

    [
        function(ctx) {
            return this.barline !== "double" || !ctx.body[ctx.idx + 2];
        },
        function(ctx) {
            // It's no longer a double barline.
            this.barline = true;
            return -1;
        },
        "Double barlines only exist at the end of a piece."
    ]
];

var createBarline = (ctx, mode) => {
    mode = mode || true;

    if (ctx.curr().beam) {
        ctx.eraseCurrent();
        for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
            delete ctx.body[j].inBeam;
            if (ctx.body[j] === this) {
                ctx.body.splice(j, 0, {barline: mode});
                ++j;
            }
        }
        return "line";
    }
    return ctx.insertBefore(new BarlineBridge({barline: mode}));
};

module.exports = BarlineBridge;
module.exports.createBarline = createBarline;
