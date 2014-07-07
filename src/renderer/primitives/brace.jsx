/**
 * Renders a piano bracket or other kind of brace.
 *
 * @jsx React.DOM
 */

var React = require('react');

var Barline = require("./barline.jsx");
var Glyph = require("./glyph.jsx");
var Group = require("./group.jsx");
var SMuFL = require("./SMuFL.js");

var Brace = React.createClass({
    propTypes: {
        staves: React.PropTypes.array,
        idx: React.PropTypes.number,
        fontSize: React.PropTypes.number
    },

    render: function() {
        var FONT_SIZE_FACTOR = require("../renderer.jsx").FONT_SIZE_FACTOR;
        var staves = this.props.staves;
        var fontSize = this.props.fontSize;
        var idx = this.props.idx;

        var s = 3.31;
        return <Group>
            {[<Glyph transform={"scale(" + s + "," + s + ")" +
                    "translate(" + -this.props.fontSize*this.props.x*(1-1/s) + "," +
                        -(1-1/s)*this.props.fontSize*(this.props.y + this.props.y2)/2 + ")"}
                fontSize={this.props.fontSize/FONT_SIZE_FACTOR}
                key={0}
                x={this.props.x - 1/8}
                y={(this.props.y + this.props.y2)/2 + 2/4}
                glyphName={"brace"} />,
            <Barline
                height={1.64}
                key={1}
                x={this.props.x}
                y={this.props.y + (1.63 - 2/4)} />]}
        </Group>;
    }
});

module.exports = Brace;
