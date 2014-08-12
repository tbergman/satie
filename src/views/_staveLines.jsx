/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Group = require("./_group.jsx");
var Line = require("./_line.jsx");
var SMuFL = require("ripienoUtil/SMuFL.ts");

var StaveLines = React.createClass({
    getDefaultProps: function() {
        return {
            y: 0,
            width: 300
        };
    },
    render: function() {
        return <Group>
            {_.times(5, i => <Line
                key={"staff-" + i}
                x1={this.props.x}
                x2={this.props.x + this.props.width}
                y1={this.props.y - 0.25*(i - 2)}
                y2={this.props.y - 0.25*(i - 2)}
                stroke="#6A6A6A"
                victoriaXStrokeWidthFactor={0}
                strokeWidth={SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness/4} />)}
        </Group>;
    }
});

module.exports = StaveLines;
