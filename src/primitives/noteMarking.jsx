/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var NoteMarking = React.createClass({
    propTypes: {
        marking: function(props, propName) {
            // articulations, ornaments, pauses
            var marking = props[propName];
            //console.assert(marking.indexOf("artic") === 0 ||
            //    SMuFL.glyphClasses.pauses.indexOf(marking + "Above") !== -1,
            //    "Markings are articulations or pauses");

            console.assert(marking.indexOf("Above") === -1 &&
                marking.indexOf("Below") === -1,
                "Markings should specify direction instead of including Above or Below in marking name");
        },
        direction: React.PropTypes.oneOf([1, -1]),
        notehead: React.PropTypes.string.isRequired,
        forceBelow: React.PropTypes.bool.isRequired,
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            idx: 0,
            direction: 1,
            forceBelow: false
        };
    },

    render: function() {
        var offset = SMuFL.bravuraBBoxes[this.props.notehead].bBoxNE;
        var start = SMuFL.bravuraBBoxes[this.props.notehead].bBoxSW;
        var o2 = SMuFL.bravuraBBoxes[this.getGlyphName()].bBoxSW;
        var s2 = SMuFL.bravuraBBoxes[this.getGlyphName()].bBoxNE;
        return <Glyph
            x={this.props.x + (offset[0] - start[0])/4/2 + (o2[0] - s2[0])/4/2}
            y={this.props.y - this.getYOffset()}
            glyphName={this.getGlyphName()} />;
    },

    getDirectionString: function() {
        if (SMuFL.bravuraBBoxes[this.props.marking]) {
            return "";
        } else if (this.getDirection() === 1) {
            return "Below";
        } else if (this.getDirection() === -1) {
            return "Above";
        }
    },
    shouldBeAboveStaff: function() {
        if (this.props.marking.indexOf("fermata") === 0) {
            return true;
        }
        return false;
    },
    getGlyphName: function() {
        return this.props.marking + this.getDirectionString();
    },
    getDirection: function() {
        if (this.shouldBeAboveStaff()) {
            return -1;
        }
        return this.props.direction;
    },
    getFontOffset: getFontOffset,
    getYOffset: function() {
        if (this.shouldBeAboveStaff()) {
            return (5.5 + this.props.idx - 3)/4;
        }

        if (this.getDirection() === 1) {
            return (this.props.line - 1.5 - this.props.idx - 3)/4;
        }

        return (this.props.line + 1.5 + this.props.idx - 3)/4;
    }
});

module.exports = NoteMarking;
