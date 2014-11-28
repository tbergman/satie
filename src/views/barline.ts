/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");

import C = require("../stores/contracts");
import BarlineModel = require("../stores/barline");
import Group = require("./_group");
import Rect = require("./_rect");
import Line = require("./_line");
import SMuFL = require("../util/SMuFL");
import hash = require("../util/hash");

class Barline extends TypedReact.Component<Barline.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;
        this.hash = this.getHash(spec);

        var thickX = spec.x + defaults.barlineSeparation*10 +
            defaults.thickBarlineThickness*10;

        if (spec.barline === C.Barline.Double) {
            return <!Group.Component>
                <!Line.Component
                    key={1}
                    x1={spec.x}
                    x2={spec.x}
                    y1={spec.y - spec.height - spec.yOffset}
                    y2={spec.y + spec.height - spec.yOffset}
                    stroke={spec.color}
                    victoriaYStrokeWidthFactor={0}
                    fill={spec.color}
                    strokeWidth={defaults.thinBarlineThickness*10} />
                <!Line.Component
                    key={2}
                    x1={thickX}
                    x2={thickX}
                    y1={spec.y - spec.height - spec.yOffset}
                    y2={spec.y + spec.height - spec.yOffset}
                    victoriaYStrokeWidthFactor={0}
                    stroke={spec.color}
                    fill={spec.color}
                    strokeWidth={defaults.thickBarlineThickness*10} />
                {/* HACK HACK HACK: We're drawing a white bar to
                    cover over the empty part of the stave.*/}
                <!Rect.Component
                    key={3}
                    opacity={1.0}
                    x={spec.x + defaults.barlineSeparation*10 +
                        defaults.thickBarlineThickness*10 +
                        defaults.thinBarlineThickness*10}
                    y={spec.y - spec.height - 1 - spec.yOffset}
                    stroke={"#FFFFFF"}
                    fill={"#FFFFFF"}
                    height={spec.height*2 + 2}
                    width={4000} />
            </Group.Component>;
        }

        return <!Line.Component
            x1={spec.x}
            x2={spec.x}
            y1={spec.y - spec.height - spec.yOffset}
            y2={spec.y + spec.height - spec.yOffset}
            stroke={spec.color}
            fill={spec.color}
            strokeWidth={defaults.thinBarlineThickness*10} />
    }

    /**
     * React lifecycle method.
     */
    shouldComponentUpdate(nextProps: Barline.IProps) {
        return this.getHash(nextProps.spec) !== this.hash;
    }

    /**
     * Compute a hash for quickly checking whether the component needs updating.
     */
    getHash(spec: BarlineModel) {
        return hash(
            (""+spec.barline) +
            (""+spec.x) +
            (""+spec.y) +
            (""+spec.color));
    }

    /**
     * Used to check if component needs updating.
     */
    hash: number = NaN;
};

module Barline {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Barline);

    export interface IProps {
        key: number;
        spec: BarlineModel;
        fontSize: number;
    }
}

export = Barline;
