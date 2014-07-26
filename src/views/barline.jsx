/**
 * Renderes a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 *
 * @jsx React.DOM
 */

var React = require("React");
var _ = require("lodash");
var assert = require("assert");

var BarlineModel = require("../stores/barline.jsx");
var Group = require("./_group.jsx");
var Rect = require("./_rect.jsx");
var Line = require("./_line.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var hash = require("ripienoUtil/hash.jsx");

var Barline = React.createClass({
    proptypes: {
        spec: React.PropTypes.instanceOf(BarlineModel)
    },
    getHash: function(spec) {
        var statics = ["stroke"];
        var dynamics = ["x", "y"];
        return hash(
            _.reduce(statics, (memo, field) => memo + JSON.stringify(spec[field]), "") +
            _.reduce(dynamics, (memo, field) => memo + JSON.stringify(spec[field]()), ""));
    },
    shouldComponentUpdate: function(nextProps) {
        return this.getHash(nextProps.spec) !== this.hash;
    },

    render: function() {
        var spec = this.props.spec;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;
        this.hash = this.getHash(spec);

        var thickX = spec.x() + defaults.barlineSeparation/4 +
            defaults.thickBarlineThickness/4;

        if (spec.barline === "double") {
            return <Group>
                {[<Line key={1}
                    x1={spec.x()}
                    x2={spec.x()}
                    y1={spec.y() - spec.height}
                    y2={spec.y() + spec.height}
                    stroke={spec.color}
                    victoriaYStrokeWidthFactor={0}
                    fill={spec.color}
                    strokeWidth={defaults.thinBarlineThickness/4} />,
                <Line key={2}
                    x1={thickX}
                    x2={thickX}
                    y1={spec.y() - spec.height}
                    y2={spec.y() + spec.height}
                    victoriaYStrokeWidthFactor={0}
                    stroke={spec.color}
                    fill={spec.color}
                    strokeWidth={defaults.thickBarlineThickness/4} />,
                // HACK HACK HACK: We're drawing a white bar to
                // cover over the empty part of the stave.
                <Rect
                    key={3}
                    x={spec.x() + defaults.barlineSeparation/4 +
                        defaults.thickBarlineThickness/4 +
                        defaults.thinBarlineThickness/4}
                    y={spec.y() - spec.height - 0.1}
                    stroke="#FFFFFF"
                    fill="#FFFFFF"
                    height={spec.height*2 + 0.2}
                    width={400} />]}
            </Group>;
        }
        return <Line
            x1={spec.x()}
            x2={spec.x()}
            y1={spec.y() - spec.height}
            y2={spec.y() + spec.height}
            victoriaYStrokeWidthFactor={0}
            stroke={spec.color}
            fill={spec.color}
            strokeWidth={defaults.thinBarlineThickness/4} />;
    }
});

module.exports = Barline;
