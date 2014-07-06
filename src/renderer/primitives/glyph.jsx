/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 *
 * @jsx React.DOM
 */

var React = require('react');

var RenderableMixin = require("./renderable.jsx");
var SMuFL = require("./SMuFL.js");
var Victoria = require("./victoria/hellogl.jsx");

var VGlyph = Victoria.VGlyph;

if (typeof window !== "undefined") {
    require("./glyph.less");
}

var Glyph = React.createClass({
    propTypes: {
        glyphName: React.PropTypes.string,
        x: React.PropTypes.number,
        y: React.PropTypes.number,
        fill: React.PropTypes.string
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            fill: "black"
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.fill !== nextProps.fill ||
            this.props.glyphName !== nextProps.glyphName;
    },

    renderSVG: function() {
        var Renderer = require("../renderer.jsx");
        var px = this.props.fontSize ?
                this.props.x*this.props.fontSize*Renderer.FONT_SIZE_FACTOR :
                this.props.x + "em";

        var py = this.props.fontSize ?
                this.props.y*this.props.fontSize*Renderer.FONT_SIZE_FACTOR :
                this.props.y + "em";

        var text = <text
                x={px}
                y={py}
                fill={this.props.fill}
                transform={this.props.transform}
                className="mn_">
            {SMuFL.getGlyphCode(this.props.glyphName)}
        </text>;

        if (!this.props.selectioninfo) {
            return text;
        } else {
            // Some information, such as the exact position of dots and triplets
            // is computed in the primitives layer rather than the renderer layer.

            // In order to pass information about the type of object being selected
            // up to hover and click events, we set data-selectioninfo. Unfortunately,
            // "pointer-events: visible" (and friends) consider the entire (much-larger)
            // area of the glyph to be filled, ignoring transparency. As a workaround,
            // we set "pointer-events: none" on the text, and create an invisible rectangle
            // with data-selectioninfo.
            return <g>
                {text}
                <rect
                    data-selectioninfo={this.props.selectioninfo}
                    width={"0.5em"}
                    height={"0.5em"}
                    x={this.props.x + "em"}
                    y={this.props.y - 0.4 + "em"}
                    fill="transparent"
                    className="mn_handle" />
                </g>;
        }
    },
    renderGL: function() {
        var fill = this.props.stroke || this.props.fill;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return <VGlyph
            x={this.props.x}
            y={this.props.y}
            fill={fill}
            stroke={fill}
            glyphName={this.props.glyphName} />;
    },
    mixins: [RenderableMixin]
});

module.exports = Glyph;
