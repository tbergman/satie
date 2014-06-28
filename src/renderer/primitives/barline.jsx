/**
 * Renderes a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 *
 * @jsx React.DOM
 */

var Line = require("./line.jsx");
var React = require('react');
var SMuFL = require("./SMuFL.js");

var Group = require("./group.jsx");

var Barline = React.createClass({
    proptypes: {
        x: React.PropTypes.number.isRequired,
        y: React.PropTypes.number.isRequired,
        height: React.PropTypes.number.isRequired,
        strokeWidth: React.PropTypes.number.isRequired
    },
    getDefaultProps: function() {
        return {
            height: 2/4,
            strokeWidth: SMuFL.bravuraMetadata.engravingDefaults.thinBarlineThickness/4
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.stroke !== nextProps.stroke;
    },

    render: function() {
        if (this.props.barline === "double") {
            return <Group>
                {[<Barline
                    key={1}
                    height={this.props.height}
                    x={this.props.x}
                    y={this.props.y}
                    stoke={this.props.stroke}
                    strokeWidth={this.props.strokeWidth} />,
                <Barline
                    key={2}
                    height={this.props.height}
                    x={this.props.x + SMuFL.bravuraMetadata.engravingDefaults.barlineSeparation/4 +
                        SMuFL.bravuraMetadata.engravingDefaults.thickBarlineThickness/4/2 +
                        this.props.strokeWidth}
                    y={this.props.y}
                    stoke={this.props.stroke}
                    strokeWidth={SMuFL.bravuraMetadata.engravingDefaults
                        .thickBarlineThickness/4} />,
                // HACK HACK HACK: We're drawing a white bar to
                // cover over the empty part of the stave.
                <rect
                    key={3}
                    x={this.props.x + SMuFL.bravuraMetadata.engravingDefaults.barlineSeparation/4 +
                        SMuFL.bravuraMetadata.engravingDefaults.thickBarlineThickness/4 +
                        this.props.strokeWidth + "em"}
                    y={this.props.y - this.props.height - 0.1 + "em"}
                    stroke="#FFFFFF"
                    fill="#FFFFFF"
                    height={this.props.height*2 + 0.2 + "em"}
                    width="400em" />]}
            </Group>;
        }
        return <Line
            className={this.props.className}
            x1={this.props.x}
            x2={this.props.x}
            y1={this.props.y - this.props.height}
            y2={this.props.y + this.props.height}
            stroke={this.props.stroke || "#2A2A2A"}
            fill={this.props.stroke || "#2A2A2A"}
            strokeWidth={this.props.strokeWidth} />;
    }
});

module.exports = Barline;
