/**
 * @jsx React.DOM
 */

var React = require('react');

var SMuFL = require("./SMuFL.js");

require("./glyph.less");

var Glyph = React.createClass({
    propTypes: {
        glyphName: React.PropTypes.string,
        x: React.PropTypes.number,
        y: React.PropTypes.number,
        fill: React.PropTypes.string
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            fill: "black"
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.fill !== nextProps.fill ||
            this.props.glyphName !== nextProps.glyphName;
    },

    render: function() {
        return <text
                x={this.props.x + "em"}
                y={this.props.y + "em"}
                fill={this.props.fill}
                className="mn_">
            {SMuFL.getGlyphCode(this.props.glyphName)}
        </text>;
    }
});

module.exports = Glyph;
