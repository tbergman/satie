/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");


require("./selectionRect.less");

var SelectionRect = React.createClass({
    render: function() {
        var Renderer = require("./renderer.jsx");
        return <g
                key="selection"
                style={{fontSize: this.props.fontSize*Renderer.FONT_SIZE_FACTOR + "px"}}>
            <rect className="marquee"
                    width={this.props.width + "em"}
                    height={this.props.height + "em"}
                    x={this.props.x + "em"}
                    y={this.props.y + "em"} >
                </rect>
        </g>;
    }
});

module.exports = SelectionRect;
