/**
 * Calculates a way to render a beam given two endpoints.
 * Does interesting math. Probably needs to be redone to match
 * the suggestions in "Behind Bars".
 *
 * See also BeamGroup and BeamGroupBridge.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var Beam = React.createClass({
    propTypes: {
        // If you add a prop, also add it to shouldComponentUpdate!
        line1: React.PropTypes.number.isRequired,
        line2: React.PropTypes.number.isRequired,
        width: React.PropTypes.number.isRequired,
        strokeWidth: React.PropTypes.number.isRequired,
        direction: React.PropTypes.oneOf([1, -1]).isRequired,
        beams: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            strokeWidth: 0.14,
            beams: 1
        };
    },

    render: function() {
        return <g><svg
                x={0}
                y={0}
                width={this.props.scaleFactor}
                height={this.props.scaleFactor}
                viewBox="0 0 1 1"
                className="overflow">
            {_(this.props.beams).times(idx => 
                <polygon
                    key={idx}
                    points={this.getX1() + "," + this.getY1(0, idx) + " " +
                        this.getX2() + "," + this.getY2(0, idx) + " " +
                        this.getX2() + "," + this.getY2(1, idx) + " " +
                        this.getX1() + "," + this.getY1(1, idx)}
                    strokeWidth={0} />
            )}
        </svg>
            {this.tuplet()}
        </g>;
    },

    /**
     * Beams are particularly slow to render.
     */
    shouldComponentUpdate: function(nextProps) {
        var ret = this.props.line1 !== nextProps.line1 ||
            this.props.line2 !== nextProps.line2 ||
            this.props.width !== nextProps.width ||
            this.props.strokeWidth !== nextProps.strokeWidth ||
            this.props.direction !== nextProps.direction ||
            this.props.tuplet !== nextProps.tuplet ||
            this.props.beams !== nextProps.beams ||
            this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y;
        return ret;
    },

    /**
     * Offset because the notehead has a non-zero width.
     */
    getLineXOffset: function() {
        return this.getDirection() * -this.props.stemWidth/2;
    },

    /**
     * Offset because the notehead has a non-zero height.
     * The note-head is NOT CENTERED at it's local origin.
     */
    getYOffset: function() {
        if (this.getDirection() === -1) {
            return 0.040;
        }
        return 0.005;
    },

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    getDirection: function() {
        return this.props.direction;
    },
    getFontOffset: getFontOffset,

    getX1: function() {
        return this.props.x +
            this.getFontOffset(this.props.notehead1)[0]/4 +
            this.getLineXOffset();
    },
    getY1: function(incl, idx) {
        return this.props.y -
            this.getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead1)[1]/4 -
            (this.props.line1 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*this.props.strokeWidth;
    },

    getX2: function() {
        return this.props.x +
            this.getFontOffset(this.props.notehead2)[0]/4 +
            this.getLineXOffset() +
            this.props.width;
    },
    getY2: function(incl, idx) {
        return this.props.y -
            this.getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead2)[1]/4 -
            (this.props.line2 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*this.props.strokeWidth;
    },

    /**
     * Returns a React component instance showing the tuplet number
     */
    tuplet: function() {
        if (!this.props.tuplet) {
            return null;
        } else {
            var offset = this.getX2() - this.getX1();
            var y = (this.getY1(1, this.props.beams - 1) +
                        this.getY2(1, this.props.beams - 1))/2 -
                    (0.3 + 0.2*this.props.beams)*this.getDirection();

            // XXX: all tuplets are drawn as triplets.
            return <Glyph
                fill={"black"}
                glyphName={"tuplet3"}
                x={this.props.x + offset/2}
                y={y} />;
        }
    }
});

module.exports = Beam;
