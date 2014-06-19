/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Group = require("./group.jsx");
var Line = require("./line.jsx");
var SMuFL = require("./SMuFL.js");

var StaveLines = React.createClass({
    getDefaultProps: function() {
        return {
            y: 0,
            width: 300
        };
    },
    render: function() {
        return <Group>
            {_(5).times(i => <Line
                key={"staff-" + i}
                x1={this.props.x}
                x2={this.props.x + this.props.width}
                y1={this.props.y - 0.25*(i - 2)}
                y2={this.props.y - 0.25*(i - 2)}
                stroke="#6A6A6A"
                strokeWidth={SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness/4} />)}
        </Group>;
    }
});

module.exports = StaveLines;
