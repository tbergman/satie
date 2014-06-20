/**
 * Renders a note head.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Accidental = require("./accidental.jsx");
var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

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
            glyphName={this.props.notehead} />;
    }
});

module.exports = NoteHead;