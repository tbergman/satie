/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Glyph = require("./glyph.jsx");
var Note = require("./note.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var getExtremeLine = Note.getExtremeLine;

var Slur = React.createClass({
    propTypes: {
        line1: React.PropTypes.any.isRequired,
        line2: React.PropTypes.any.isRequired,
        width: React.PropTypes.number.isRequired,
        strokeWidth: React.PropTypes.number.isRequired,
        direction: React.PropTypes.oneOf([1, -1]).isRequired
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            strokeWidth: 0.14
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.line1 !== nextProps.line1 ||
            this.props.line2 !== nextProps.line2 ||
            this.props.width !== nextProps.width ||
            this.props.strokeWidth !== nextProps.strokeWidth ||
            this.props.direction !== nextProps.direction ||
            this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y;
    },

    render: function() {
        var x2mx1 = this.getX2() - this.getX1();
        var x1mx2 = -x2mx1;
        var relw = 0.08;
        var y1my2 = this.getY1(0,0) - this.getY2(0,0);
        var absw = -this.getDirection()*0.2080307/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*this.getDirection() === 1) {
            absw *= 2;
        }
        return <svg
                x={0}
                y={0}
                width={this.props.scaleFactor}
                height={this.props.scaleFactor}
                viewBox="0 0 1 1"
                className="overflow">
            <path
                d={
                    "M" +
                        this.getX2() + "," + this.getY2(0, 0) +
                    "c" +
                        (0.28278198/1.23897534*x1mx2) + "," +
                            ((this.getDirection() === -1 ? y1my2 : 0) + absw) + " " +
                        (0.9561935/1.23897534*x1mx2)  + "," +
                            ((this.getDirection() === -1 ? y1my2 : 0) + absw) + " " +
                        (1.23897534/1.23897534*x1mx2) + "," + (y1my2) +
                    "c " +
                        (0.28278198/1.23897534*x2mx1) + "," +
                            ((this.getDirection() === -1 ? 0 :-y1my2) + absw + relw) + " " +
                        (0.95619358/1.23897534*x2mx1) + "," +
                            ((this.getDirection() === -1 ? 0 :-y1my2) + absw + relw) + " " +
                        (1.23897534/1.23897534*x2mx1) + "," + (-y1my2)
                    }
                fill={"black"}
                strokeWidth={0.03}
                stroke={"black"} />
        </svg>;
    },

    getYOffset: function() {
        if (this.getDirection() === -1) {
            return -0.25;
        }
        return 0.25;
    },
    getDirection: function() {
        return this.props.direction;
    },
    getFontOffset: getFontOffset,
    getX1: function() {
        return this.props.x;
    },
    getX2: function() {
        return this.props.x + this.props.width;
    },
    getY1: function(incl, idx) {
        return this.props.y -
            this.getYOffset() -
            (getExtremeLine(this.props.line1, -this.getDirection()) - 3)/4;
    },
    getY2: function(incl, idx) {
        return this.props.y -
            this.getYOffset() -
            (getExtremeLine(this.props.line2, -this.getDirection()) - 3)/4;
    }
});

module.exports = Slur;
