/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var Clef = require("../primitives/clef.jsx");

class ClefBridge extends Bridge {
    annotateImpl(ctx) {
        this._isChange = ctx.clef;
        this._clef = ctx.clef = (this.clef === "detect") ? ctx.prevClef : this.clef;
        var next = ctx.next();
        if (next.pitch || next.chord) {
            if (next.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }
        if (this._isChange) {
            ctx.x += -0.01 + this._annotatedSpacing/4;
        } else {
            ctx.x += 0.6 + this._annotatedSpacing/4;
        }
        return true;
    }
    visible() {
        return false !== this.isVisible;
    }
    render() {
        return <Clef
            key={this.key()}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
            x={this.x()} 
            y={this.y()}
            isChange={this._isChange}
            clef={this._clef} />;
    }
    toLylite(lylite) {
        if (this["_annotated"]) {
            return;
        }
        lylite.push("\\clef " + this.clef + "\n");
    }
}

var clefIsNotRedundant = function(ctx) {
    // XXX HACK {
    if (false === this.isVisible) {
        return true;
    }
    // }
    return this.temporary ||
        ctx.clef !== this.clef ||
        this.clef === "detect";
};

var createClef = function(ctx) {
    return ctx.insertPast(new ClefBridge({
        clef: (ctx.prevClef ? "detect" : "treble"),
        _annotated: "createClef"
    }));
};

ClefBridge.prototype.prereqs = [
    [
        clefIsNotRedundant,
        (ctx) => ctx.eraseCurrent(),
        "A clef must not be redundant."
    ],
    [
        function(ctx) {
            return !ctx.timeSignature || ctx.beats < ctx.timeSignature.beats; },
        function(ctx) {
            var BarlineBridge = require("./barlineBridge.jsx");
            return BarlineBridge.createBarline(ctx);
        },
        "Barlines should be before clefs when either is possible"
    ]
];

var standardClefs = [
    {
        name: "treble",
        glyph: "gClef",
        x: -0.4,
        y: 0.4
    }, {
        name: "bass",
        glyph: "fClef",
        x: -0.4,
        y: 0.1
    }, {
        name: "tenor",
        glyph: "cClef",
        x: -0.4,
        y: 0.0
    }, {
        name: "alto",
        glyph: "cClef",
        x: -0.4,
        y: 0.2
    }
];

module.exports = ClefBridge;
module.exports.createClef = createClef;
module.exports.standardClefs = standardClefs;
