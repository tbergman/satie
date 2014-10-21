/**
 * Renderes a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */

import ReactTS = require("react-typescript");

import C = require("../stores/contracts");
import BarlineModel = require("../stores/barline");
import Group = require("./_group");
import Rect = require("./_rect");
import Line = require("./_line");
import SMuFL = require("../util/SMuFL");
import hash = require("../util/hash");

class Barline extends ReactTS.ReactComponentBase<Barline.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;
        this.hash = this.getHash(spec);

        var thickX = spec.x + defaults.barlineSeparation/4 +
            defaults.thickBarlineThickness/4;

        if (spec.barline === C.Barline.Double) {
            return Group(null,
                [Line.Component({key: 1,
                    x1: spec.x,
                    x2: spec.x,
                    y1: spec.y - spec.height - spec.yOffset,
                    y2: spec.y + spec.height - spec.yOffset,
                    stroke: spec.color,
                    victoriaYStrokeWidthFactor: 0,
                    fill: spec.color,
                    strokeWidth: defaults.thinBarlineThickness/4}),
                Line.Component({key: 2,
                    x1: thickX,
                    x2: thickX,
                    y1: spec.y - spec.height - spec.yOffset,
                    y2: spec.y + spec.height - spec.yOffset,
                    victoriaYStrokeWidthFactor: 0,
                    stroke: spec.color,
                    fill: spec.color,
                    strokeWidth: defaults.thickBarlineThickness/4}),
                // HACK HACK HACK: We're drawing a white bar to
                // cover over the empty part of the stave.
                Rect.Component({
                    key: 3,
                    opacity: 1.0,
                    x: spec.x + defaults.barlineSeparation/4 +
                        defaults.thickBarlineThickness/4 +
                        defaults.thinBarlineThickness/4,
                    y: spec.y - spec.height - 0.1 - spec.yOffset,
                    stroke: "#FFFFFF",
                    fill: "#FFFFFF",
                    height: spec.height*2 + 0.2,
                    width: 400})]
            );
        }
        return Line.Component({
            x1: spec.x,
            x2: spec.x,
            y1: spec.y - spec.height - spec.yOffset,
            y2: spec.y + spec.height - spec.yOffset,
            stroke: spec.color,
            fill: spec.color,
            strokeWidth: defaults.thinBarlineThickness/4});
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
    export var Component = ReactTS.createReactComponent(Barline);

    export interface IProps {
        key: number;
        spec: BarlineModel;
        fontSize: number;
    }
}

export = Barline;
