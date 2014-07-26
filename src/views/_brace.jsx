/**
 * Renders a piano bracket or other kind of brace.
 *
 * @jsx React.DOM
 */

var React = require("react");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var Line = require("./_line.jsx");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");

var Brace = React.createClass({
    propTypes: {
        staves: React.PropTypes.array,
        idx: React.PropTypes.number,
        fontSize: React.PropTypes.number
    },

    render: function() {
        var FONT_SIZE_FACTOR = renderUtil.FONT_SIZE_FACTOR;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;
        var staves = this.props.staves;
        var fontSize = this.props.fontSize;
        var idx = this.props.idx;

        var s = 3.31;
        return <Group>
            {[<Glyph transform={"scale(" + s + "," + s + ")" +
                    "translate(" + -FONT_SIZE_FACTOR*
                        this.props.fontSize*this.props.x*(1-1/s) + "," +
                    -(1-1/s)*FONT_SIZE_FACTOR*this.props.fontSize*
                        (this.props.y + this.props.y2)/2 + ")"}
                fontSize={this.props.fontSize}
                key={0}
                x={this.props.x - 1/8}
                y={(this.props.y + this.props.y2)/2 + 2/4}
                glyphName={"brace"} />,
            <Line
                stroke={"black"}
                strokeWidth={defaults.thinBarlineThickness/4}
                fontSize={this.props.fontSize}
                key={1}
                x1={this.props.x}
                x2={this.props.x}
                y1={this.props.y + (1.63 - 2/4) - 3.27/2}
                y2={this.props.y + (1.63 - 2/4) + 3.27/2} />]}
        </Group>;
    }
});

module.exports = Brace;
