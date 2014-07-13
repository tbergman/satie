/**
 * Calculates a way to render a beam given two endpoints.
 * Does interesting math. Probably needs to be redone to match
 * the suggestions in "Behind Bars".
 *
 * See also BeamGroup and BeamGroupModel.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var Glyph = require("./glyph.jsx");
var Group = require("./group.jsx");
var RenderableMixin = require("./renderable.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var Victoria = require("../renderer/victoria/hellogl.jsx");
var getFontOffset = require("./getFontOffset.jsx");

var VRect = Victoria.VRect;

var Beam = React.createClass({
    propTypes: {
        // If you add a prop, also add it to shouldComponentUpdate!
        line1: React.PropTypes.number.isRequired,
        line2: React.PropTypes.number.isRequired,
        width: React.PropTypes.number.isRequired,
        direction: React.PropTypes.oneOf([1, -1]).isRequired,
        beams: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            beams: 1
        };
    },

    renderSVG: function() {
        var f = this.props.fontSize * renderUtil.FONT_SIZE_FACTOR;
        return <Group>
            {_.times(this.props.beams, idx => 
                <polygon
                    key={idx}
                    points={f*this.getX1() + "," + f*this.getY1(0, idx) + " " +
                        f*this.getX2() + "," + f*this.getY2(0, idx) + " " +
                        f*this.getX2() + "," + f*this.getY2(1, idx) + " " +
                        f*this.getX1() + "," + f*this.getY1(1, idx)}
                    stroke={this.props.stroke}
                    fill={this.props.stroke}
                    strokeWidth={0} />
            )}
            {this.tuplet()}
        </Group>;
    },

    renderGL: function() {
        return <Group>
            {_.times(this.props.beams, idx => <VRect
                key={idx}
                x1={this.getX1()} x2={this.getX2()}
                y1={this.getY1(0, idx)} y2={this.getY1(1, idx)}
                fill={this.props.stroke}
                skewx={0} skewY={this.getY1(1, idx) - this.getY2(1, idx)} />)}
            {this.tuplet()}
        </Group>;
    },

    /**
     * Beams are particularly slow to render.
     */
    shouldComponentUpdate: function(nextProps) {
        var ret =
            this.props.beams !== nextProps.beams ||
            this.props.direction !== nextProps.direction ||
            this.props.line1 !== nextProps.line1 ||
            this.props.line2 !== nextProps.line2 ||
            this.props.stroke !== nextProps.stroke ||
            this.props.tuplet !== nextProps.tuplet ||
            this.props.tupletsTemporary !== nextProps.tupletsTemporary ||
            this.props.width !== nextProps.width ||
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
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
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
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
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
                selectioninfo={"beamTuplet"}
                fill={this.props.tupletsTemporary ? "#A5A5A5" : "black"}
                glyphName={"tuplet3"}
                fontSize={this.props.fontSize}
                x={this.props.x + offset/2}
                y={y} />;
        }
    },

    mixins: [RenderableMixin]
});

module.exports = Beam;
