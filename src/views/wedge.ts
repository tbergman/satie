/**
 * @file Renders a crescendo or diminuendo.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, November 2014
 */

import ReactTS = require("react-typescript");

import WedgeModel = require("../stores/wedge");
import Group = require("./_group");
import Line = require("./_line");

class Wedge extends ReactTS.ReactComponentBase<Wedge.IProps, {}> {
    render(): React.ReactComponent<any, any> {
        var spec = this.props.spec;
        var strokeWidth = 0.04;
        var isCrec = spec.wedgeType === WedgeModel.Type.Crescendo;

        if (spec.wedgeType === WedgeModel.Type.Stop) {
            return null;
        }

        var yOut = [
            spec.y - strokeWidth / 2 + 1.2 - 0.15,
            spec.y - strokeWidth / 2 + 1.2 + 0.15
        ];

        var yIn = [
            spec.y - strokeWidth / 2 + 1.2,
            spec.y - strokeWidth / 2 + 1.2,
        ];

        return Group(null,
            Line.Component({
                x1: spec.x,
                x2: spec.x + 0.8,
                y1: (isCrec ? yIn : yOut)[0],
                y2: (isCrec ? yOut : yIn)[0],
                stroke: "#000000",
                strokeWidth: 0.04
            }),
            Line.Component({
                x1: spec.x,
                x2: spec.x + 0.8,
                y1: (isCrec ? yIn : yOut)[1],
                y2: (isCrec ? yOut : yIn)[1],
                stroke: "#000000",
                strokeWidth: 0.04
            })
        );
    }
}

module Wedge {
    "use strict";
    export var Component = ReactTS.createReactComponent(Wedge);
    export interface IProps {
        fontSize: number;
        key: number;
        spec: WedgeModel;
    }
}

export = Wedge;