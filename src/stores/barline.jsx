/**
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var _ = require("lodash");

var EndMarkerModel = require("./endMarker.jsx");
var KeySignatureModel = require("./keySignature.jsx");

class BarlineModel extends Model {
    annotateImpl(ctx) {
        if (ctx.stave.pianoStaff) {
            this.onPianoStaff = true;
        };
        ctx.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        ctx.beats = 0;
        ++ctx.bar;
        ctx.renderKey_eInBar = {};
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);

        this.height = this.onPianoStaff ? 1.15 : 2/4;
        this.yOffset = this.onPianoStaff ? (2/4 - 1.15): 0;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");
        return true;
    }
    toLylite(lylite) {
        lylite.push("|");
    }
}

BarlineModel.prototype.prereqs = [
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
            if (ctx.next().isNote()) {
                // XXX: Also check that notes are on the same beat!
                // e.g., | C/////
                //       | C/C#// will add spacing, but it shouldn't!
                this.annotatedAccidentalSpacing = 0.2*
                    (_.any(_.filter(ctx.next().intersects, l => l.isNote()),
                           n => n.containsAccidental(ctx)) ? 1 : 0);
            } else {
                this.annotatedAccidentalSpacing = 0;
            }
            return true;
        },
        "Barlines followed by accidentals have additional padding"
    ],

    [
        function(ctx) {
            return ctx.prev().endMarker; },
        function(ctx) {
            return ctx.insertPast(new EndMarkerModel({endMarker: true}));
        },
        "A barline must be preceeded by and endline marker"
    ],

    [
        function(ctx) {
            return this.barline !== "double" || !ctx.next(null, 2);
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
                ctx.insertFuture(new BarlineModel({barline: mode}), j);
                ++j;
            }
        }
        return "line";
    }
    return ctx.insertPast(new BarlineModel({barline: mode}));
};

module.exports = BarlineModel;
module.exports.createBarline = createBarline;