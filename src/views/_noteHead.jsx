/**
 * Renders a note head.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Accidental = require("./_accidental.jsx");
var Glyph = require("./_glyph.jsx");
var SMuFL = require("../../node_modules/ripienoUtil/SMuFL.ts");
var getFontOffset = require("./_getFontOffset.jsx");

var NoteHead = React.createClass({
    propTypes: {
        notehead: function(props, propName) {
            if (SMuFL.glyphClasses.noteheadSetDefault.indexOf(props[propName]) === -1) {
                console.warn(props[propName], " is not a valid notehead.");
            }
        }
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    },

    render: function() {
        return <Glyph
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)/4}
            fill={this.props.stroke}
            fontSize={this.props.fontSize}
            glyphName={this.props.notehead} />;
    }
});

module.exports = NoteHead;
