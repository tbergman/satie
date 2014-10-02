/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 *
 * @jsx React.DOM
 */

import React = require("react");
import ReactTS = require("react-typescript");

import RenderableMixin = require("./_renderable");
import SMuFL = require("../util/SMuFL");
var Victoria = require("../renderer/victoria/victoria");
import renderUtil = require("../util/renderUtil");

var VGlyph = Victoria.VGlyph;

if (typeof window !== "undefined") {
    require("./_glyph.less");
}

export class Glyph extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        var px = this.props.fontSize ?
                this.props.x*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR :
                <any>(this.props.x + "em");

        var py = this.props.fontSize ?
                this.props.y*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR :
                <any>(this.props.y + "em");

        var text: React.ReactComponent<any, any> = React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                transform: this.props.transform,
                className: "mn_"},
            SMuFL.getGlyphCode(this.props.glyphName)
        );

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
            return React.DOM.g(null,
                text,
                React.DOM.rect({
                    "data-selectioninfo": this.props.selectioninfo,
                    width: "0.4em",
                    height: "0.5em",
                    x: <any> (this.props.x - 0.12 + "em"),
                    y: <any> (this.props.y - 0.25 + "em"),
                    fill: "transparent",
                    className: "mn_handle"})
                );
        }
    }

    renderGL() {
        var fill = this.props.fill;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return VGlyph({
            x: this.props.x,
            y: this.props.y,
            fill: fill,
            glyphName: this.props.glyphName});
    }

    shouldComponentUpdate(nextProps: IProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.fill !== nextProps.fill ||
            this.props.glyphName !== nextProps.glyphName;
    }

    render: () => void;
}

Glyph.applyMixins(RenderableMixin);

export var Component = ReactTS.createReactComponent(Glyph);

export interface IProps {
    fill: string;
    fontSize: number;
    glyphName: string;
    selectioninfo?: string;
    transform?: string;
    x: number;
    y: number;
}
