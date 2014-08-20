/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Dot = require("./_dot.jsx");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var SMuFL = require("../../node_modules/ripienoUtil/SMuFL.ts");
var getFontOffset = require("./_getFontOffset.jsx");

var IDEAL_STEM_HEIGHT = 3.5;
var MIN_STEM_HEIGHT = 2.5;

var Rest = React.createClass({
    propTypes: {
        dotted: React.PropTypes.any,
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            dotted: false,
        };
    },

    render: function() {
        var line = this.props.line;
        return <Group>
            <Glyph
                key={"r"}
                x={this.props.x}
                y={this.props.y}
                fill={this.props.stroke}
                fontSize={this.props.fontSize}
                glyphName={this.props.notehead} />
            {this.props.dotted ? _.times(this.props.dotted, idx => <Dot
                idx={idx}
                key={idx + "d"}
                stroke={this.props.stroke}
                x={this.props.x}
                y={this.props.y}
                fontSize={this.props.fontSize}
                line={line} />): null}
            {this.props.children && _.map(this.props.children, (element, idx) => {
                element.props.direction = this.getDirection();
                element.props.line = this.getStartingLine();
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                element.props.fontSize = this.props.fontSize;
                return element;
            })}
        </Group>;
    },

    getDirection: function() {
        // TODO: stub
        return 1;
    },

    getStartingLine: function() {
        // TODO: stub
        return 3;
    }
});

module.exports = Rest;
