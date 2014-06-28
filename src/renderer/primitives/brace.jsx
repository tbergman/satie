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
        var staves = this.props.staves;
        var fontSize = this.props.fontSize;
        var idx = this.props.idx;

        if (!staves[idx].pianoStaff || !staves[idx + 1]) {
            return <Group />;
        }

        var y = staves[idx].body[0].y();
        var y2 = staves[idx + 1].body[0].y();

        var s = 3.31;
        return <Group>
            {[<Glyph transform={"scale(" + s + "," + s + ")" +
                    "translate(" + -this.props.fontSize*this.props.x*(1-1/s) + "," +
                        -(1-1/s)*this.props.fontSize*(y + y2)/2 + ")"}
                key={0}
                x={this.props.x - 1/8}
                y={(y + y2)/2 + 2/4}
                glyphName={"brace"} />,
            <Barline
                height={1.64}
                key={1}
                x={this.props.x}
                y={y + (1.63 - 2/4)} />]}
        </Group>;
    }
});

module.exports = Brace;
