var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var Accidental = require("./_accidental");
var PureModelViewMixin = require("./pureModelViewMixin");
var KeySignature = (function (_super) {
    __extends(KeySignature, _super);
    function KeySignature() {
        _super.apply(this, arguments);
    }
    KeySignature.prototype.render = function () {
        var _this = this;
        var spec = this.props.spec;
        return React.createElement("g", null, _.map(this.getAccidentals(), function (a, idx) { return React.createElement(Accidental.Component, { key: idx, x: spec.x + idx * 10, y: spec.y, line: a.line, stroke: spec.color, opacity: _this.props.opacity, accidental: a.accidental }); }));
    };
    KeySignature.prototype.getAccidentals = function () {
        var spec = this.props.spec;
        var idxes = _.times(Math.min(7, Math.abs(spec.fifths)), function (i) { return (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7; });
        if (spec.fifths >= 0) {
            return _.map(idxes, function (i) { return Object({
                line: sharps[standardClef(spec.clef)][i],
                accidental: (7 + i < spec.fifths) ? "accidentalDoubleSharp" : "accidentalSharp"
            }); });
        }
        else if (spec.fifths < 0) {
            return _.map(idxes, function (i) { return Object({
                line: flats[standardClef(spec.clef)][i],
                accidental: (7 + i < -spec.fifths) ? "accidentalDoubleFlat" : "accidentalFlat"
            }); });
        }
    };
    return KeySignature;
})(TypedReact.Component);
;
function standardClef(clef) {
    "use strict";
    switch (true) {
        case (clef.sign === "G"):
            return "treble";
        case (clef.sign === "F"):
            return "bass";
        case (clef.sign === "C" && clef.line === 3):
            return "alto";
        case (clef.sign === "C" && clef.line === 4):
            return "tenor";
        default:
            console.warn("Invalid clef?");
            return "treble";
    }
}
;
var sharps = {
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5]
};
var flats = {
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2]
};
var KeySignature;
(function (KeySignature) {
    "use strict";
    KeySignature.Component = TypedReact.createClass(KeySignature, [PureModelViewMixin]);
})(KeySignature || (KeySignature = {}));
module.exports = KeySignature;
