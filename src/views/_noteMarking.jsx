/**
 * Renders annotations like staccato, or accents.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Glyph = require("./_glyph.jsx");
var SMuFL = require("../../node_modules/ripienoUtil/SMuFL.ts");
var getFontOffset = require("./_getFontOffset.jsx");

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
                "Markings should specify direction property and omit name qualifier");
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
            x={this.props.x + this.getXOffset() + (offset[0] - start[0])/4/2 + (o2[0] - s2[0])/4/2}
            y={this.props.y - this.getYOffset()}
            fontSize={this.props.fontSize}
            staveHeight={this.props.fontSize}
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
        var above = ["fermata", "breathMark", "caesura"];
        for (var i = 0; i < above.length; ++i) {
            if (this.props.marking.indexOf(above[i]) === 0) {
                return true;
            }
        }
        return false;
    },
    shouldBeBelowStaff: function() {
        var below = ["dynamic"];
        for (var i = 0; i < below.length; ++i) {
            if (this.props.marking.indexOf(below[i]) === 0) {
                return true;
            }
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
    getXOffset: function() {
        if (this.props.marking.indexOf("caesura") === 0) {
            return -3/8; // TODO -- move to DurationModel and fix
        } else if (this.props.marking.indexOf("breathMarkComma") === 0) {
            return 3/8; // TODO -- move to DurationModel and fix
        }
        return 0;
    },
    getYOffset: function() {
        if (this.shouldBeAboveStaff()) {
            return (5.5 + this.props.idx - 3)/4;
        } else if (this.shouldBeBelowStaff()) {
            var m = (-1.5 + this.props.idx - 3)/4;
            if (m + 1.5 >= this.props.line/4) {
                m = (this.props.line)/4 - 1.5;
            }
            return m;
        }

        if (this.getDirection() === 1) {
            return (this.props.line - 1.5 - this.props.idx - 3)/4;
        }

        return (this.props.line + 1.5 + this.props.idx - 3)/4;
    }
});

module.exports = NoteMarking;
