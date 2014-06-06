/**
 * Responsible for rendering the "flag" on unbeamed eigth notes and shorter.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var Flag = React.createClass({
    propTypes: {
        direction: React.PropTypes.oneOf([1, -1]).isRequired,
        flag: function(props, propName) {
            if (props[propName].indexOf("flag") !== 0) {
                console.warn(props[propName], " must start with flag");
            }
            if (props[propName].indexOf("Up") !== -1 ||
                    props[propName].indexOf("Down") !== -1) {
                console.warn(props[propName], " must not include direction");
            }
            if (!SMuFL.glyphNames[props[propName] + "Up"]) {
                console.warn(props[propName], " is not a valid flag.");
            }
        },
        stemHeight: React.PropTypes.number.isRequired,
        stemWidth: React.PropTypes.number.isRequired,
        notehead: React.PropTypes.string.isRequired,
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            stemHeight: 3.5,
            stemWidth: 0.035
        };
    },

    render: function() {
        var fontOffset = this.getFontOffset(this.getGlyphName());
        return <Glyph
            x={this.props.x +
                fontOffset[0]/4 +
                ((this.props.direction === 1) ? this.getFontOffset()[0]/4 - this.props.stemWidth: 0)}
            y={this.props.y -
                (this.props.line - 3)/4 -
                this.getDirection()*fontOffset[1]/4 -
                this.getFontOffset()[1]/4 -
                this.getDirection()*this.props.stemHeight/4}
            glyphName={this.getGlyphName()} />;
    },

    getDirectionString: function() {
        if (this.getDirection() === 1) {
            return "Up";
        } else if (this.getDirection() === -1) {
            return "Down";
        }

        console.assert(0);
    },
    getDirection: function() {
        return this.props.direction;
    },
    getFontOffset: getFontOffset,
    getGlyphName: function() {
        return this.props.flag + this.getDirectionString();
    }
});

module.exports = Flag;
