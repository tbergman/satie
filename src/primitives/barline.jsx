/**
 * @jsx React.DOM
 */

var React = require('react');

var Barline = React.createClass({
    proptypes: {
        x: React.PropTypes.number,
        y: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y;
    },

    render: function() {
        return <line
            x1={this.props.x + "em"}
            x2={this.props.x + "em"}
            y1={this.props.y - 2/4 + "em"}
            y2={this.props.y + 2/4 + "em"}
            stroke="black"
            strokeWidth={"0.02em"} />;
    }
});

module.exports = Barline;
