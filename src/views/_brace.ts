/**
 * Renders a piano bracket or other kind of brace.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import Line = require("./_line");
import Glyph = require("./_glyph");
import Group = require("./_group");
import SMuFL = require("../../node_modules/ripienoUtil/SMuFL");

export class Brace extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        var FONT_SIZE_FACTOR = renderUtil.FONT_SIZE_FACTOR;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;

        var s = 3.31;
        return Group(null,
            [Glyph.Component({transform: "scale(" + s + "," + s + ")" +
                    "translate(" + -FONT_SIZE_FACTOR*
                        this.props.fontSize*this.props.x*(1-1/s) + "," +
                    -(1-1/s)*FONT_SIZE_FACTOR*this.props.fontSize*
                        (this.props.y + this.props.y2)/2 + ")",
                fill: "#000000",
                fontSize: this.props.fontSize,
                key: 0,
                x: this.props.x - 1/8,
                y: (this.props.y + this.props.y2)/2 + 2/4,
                glyphName: "brace"}),
            Line.Component({
                stroke: "black",
                strokeWidth: defaults.thinBarlineThickness/4,
                fontSize: this.props.fontSize,
                key: 1,
                x1: this.props.x,
                x2: this.props.x,
                y1: this.props.y + (1.63 - 2/4) - 3.27/2,
                y2: this.props.y + (1.63 - 2/4) + 3.27/2})]
        );
    }
}

export var Component = ReactTS.createReactComponent(Brace);

export interface IProps {
    x: number;
    y: number;
    y2: number;
    idx: number;
    fontSize: number;
}

