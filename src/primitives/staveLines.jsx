/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var StaveLines = React.createClass({
    getDefaultProps: function() {
        return {
            y: 0,
            width: 300
        };
    },

    render: function() {
        return <g>
            {_(5).times(i => <line
                key={"staff-" + i}
                x1={this.props.x + "em"}
                x2={this.props.x + this.props.width + "em"}
                y1={this.props.y - 0.25*(i - 2) + "em"}
                y2={this.props.y - 0.25*(i - 2) + "em"}
                stroke="black"
                strokeWidth={"0.02em"} />)}
        </g>;
    }
});

module.exports = StaveLines;
