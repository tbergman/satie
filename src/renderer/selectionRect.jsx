/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");
var assert = require("assert");

var Group = require("../views/_group.jsx");

if (typeof window !== "undefined") {
    require("./selectionRect.less");
}

var SelectionRect = React.createClass({
    render: function() {
        var Renderer = require("./renderer.ts");
        return <Group
                key="selection"
                style={{fontSize: this.props.fontSize*Renderer.FONT_SIZE_FACTOR + "px"}}>
            <rect className="marquee"
                    width={this.props.width + "em"}
                    height={this.props.height + "em"}
                    x={this.props.x + "em"}
                    y={this.props.y + "em"} >
                </rect>
        </Group>;
    }
});

module.exports = SelectionRect;
