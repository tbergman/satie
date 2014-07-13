/**
 * Responsible for the rendering of a full-sized clef.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var ClefModel = require("../stores/models/clef.jsx");
var Glyph = require("../primitives/glyph.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");

var Clef = React.createClass({
    propTypes: {
        spec: React.PropTypes.instanceOf(ClefModel)
    },
    render: function() {
        var spec = this.props.spec;
        return <Glyph
            x={spec.x() - (spec.isChange ? 0.2 : 0)}
            y={spec.y() - (this.getLine() - 3)/4}
            fill={spec.color}
            fontSize={spec.fontSize()}
            glyphName={this.getSign() + (spec.isChange ? "Change" : "")} />;
    },

    clefToSign: {
        "treble": "gClef",
        "french": "gClef",
        "alto": "cClef",
        "tenor": "cClef",
        "bass": "fClef",
        "soprano": "cClef",
        "mezzosoprano": "cClef",
        "baritone": "cClef"
    },
    getSign: function() {
        var clef = this.props.spec.clefName;
        return this.clefToSign[clef] || clef;
    },
    getLine: function() {
        return ClefModel.clefToLine[this.props.spec.clefName];
    }
});

module.exports = Clef;
