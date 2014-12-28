var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var assert = require("assert");
var Beam = require("./_beam");
var BeamGroupModel = require("../stores/beamGroup");
var C = require("../stores/contracts");
var Note = require("./_note");
var BeamGroup = (function (_super) {
    __extends(BeamGroup, _super);
    function BeamGroup() {
        _super.apply(this, arguments);
    }
    BeamGroup.prototype.render = function () {
        var spec = this.props.spec;
        var Xs = [];
        var Ys = [];
        var lines = [];
        _.each(spec.beam, function (note, idx) {
            Xs.push(note.x);
            Ys.push(note.y);
            lines.push(note.lines);
        });
        var direction = BeamGroupModel.decideDirection(lines[0] || [3], lines[lines.length - 1]);
        var line1 = getExtremeLine(lines[0] || 3, direction);
        var line2 = getExtremeLine(lines[lines.length - 1] || 3, direction);
        var m = spec.beam.length ? 10 * (line2 - line1) / (spec.beam.length - 1) : 0;
        var stemHeight1 = 35;
        var stemHeight2 = 35;
        if (m > 5) {
            stemHeight2 = stemHeight2 - direction * (m - 20) * (spec.beam.length - 1);
            m = 5;
        }
        if (m < -5) {
            stemHeight2 = stemHeight2 - direction * (m + 20) * (spec.beam.length - 1);
            m = -5;
        }
        var dynamicM = m / (Xs[Xs.length - 1] - Xs[0]);
        var b = line1 * 10 + stemHeight1;
        function getSH(direction, idx, line) {
            return (b * direction + (direction === 1 ? 0 : 69) + dynamicM * (Xs[idx] - Xs[0]) * direction) - direction * line * 10;
        }
        _.each(spec.beam, function (note, idx) {
            var sh = getSH(direction, idx, getExtremeLine(note.lines, -direction));
            if (sh < 30) {
                b += direction * (30 - sh);
                m = 0;
            }
            assert(note.strokes);
            var stroke = note.strokes[0];
            if (strokeColor !== stroke && strokeColor) {
                strokeEnabled = false;
            }
            if (!strokeColor) {
                strokeColor = stroke;
            }
        });
        var strokeColor;
        var strokeEnabled = true;
        var durationProps = [];
        _.each(spec.beam, function (note, idx) {
            durationProps.push({
                direction: direction,
                stemHeight: getSH(direction, idx, getExtremeLine(lines[idx], direction)),
                key: null,
                spec: undefined
            });
        });
        var children = spec.generate(durationProps);
        return React.createElement("g", null, React.createElement(Beam.Component, { beams: (spec.beams) || 1 /* One */, variableBeams: spec.variableBeams, variableX: spec.variableBeams ? Xs : null, direction: direction, key: "beam", line1: parseFloat("" + line1) + direction * getSH(direction, 0, line1) / 10, line2: parseFloat("" + line2) + direction * getSH(direction, spec.beam.length - 1, line2) / 10, stemWidth: 1.4, stroke: strokeEnabled ? strokeColor : "#000000", tuplet: spec.tuplet, tupletsTemporary: spec.tupletsTemporary, width: Xs[Xs.length - 1] - Xs[0], x: Xs[0], y: Ys[0] }), children);
    };
    return BeamGroup;
})(TypedReact.Component);
;
var getExtremeLine = Note.getExtremeLine;
var BeamGroup;
(function (BeamGroup) {
    "use strict";
    BeamGroup.Component = TypedReact.createClass(BeamGroup);
})(BeamGroup || (BeamGroup = {}));
module.exports = BeamGroup;
