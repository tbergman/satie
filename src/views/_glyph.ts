/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React            = require("react");
import TypedReact       = require("typed-react");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import assert           = require("assert");
import C                = require("../stores/contracts");

class Glyph extends TypedReact.Component<Glyph.IProps, {}> {
    render() {
        var px = this.props.x;
        var py = this.props.y;

        if (this.props.glyphName.substr(0, 2) === "fa") {
            assert(this.props.code);
            return React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                style: { fontSize: this.props.scale ? this.props.scale + "em" : undefined },
                className: "fa"
            }, this.props.code);
        } else {
            assert(!this.props.code);
        }

        var text: React.ReactElement<any> = React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                fontSize: 40,
                className: "mn_"},
            C.SMuFL.getGlyphCode(this.props.glyphName)
        );

        if (!this.props["selection-info"] || global.isChoreServer) {
            return text;
        } else {
            // Some information, such as the exact position of dots and triplets
            // is computed in the primitives layer rather than the renderer layer.

            // In order to pass information about the type of object being selected
            // up to hover and click events, we set data-selection-info. Unfortunately,
            // "pointer-events: visible" (and friends) consider the entire (much-larger)
            // area of the glyph to be filled, ignoring transparency. As a workaround,
            // we set "pointer-events: none" on the text, and create an invisible rectangle
            // with data-selection-info.
            return React.DOM.g(null,
                text,
                React.DOM.rect({
                    "data-selection-info": this.props["selection-info"],
                    width: 4,
                    height: 5,
                    x: <any> (this.props.x - 1.2),
                    y: <any> (this.props.y - 2.5),
                    fill: "transparent",
                    className: "mn_handle"})
                );
        }
    }
}

module Glyph {
    "use strict";

    export var Component = TypedReact.createClass(Glyph, [PureRenderMixin]);

    export interface IProps {
        fill: string;
        glyphName: string;
        "selection-info"?: string;
        transform?: string;
        x: number;
        y: number;
        opacity?: number;
        code?: string;
        /**
         * Only for FA glyphs for now
         */
        scale?: number
    }
}

export = Glyph;
