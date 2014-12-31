/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");

import BeginModel           = require("../stores/begin");
import Brace                = require("./_brace");
import C                    = require("../stores/contracts");
import PureModelViewMixin   = require("./pureModelViewMixin");
import StaveLines           = require("./_staveLines");


/**
 * Appears at the very beginning of the first stave.
 * See also NewLineView
 */
class BeginView extends TypedReact.Component<BeginView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return <!g>
            <!StaveLines.Component
                key="StaveLines"
                width={this.props.spec.staveW}
                x={spec.x}
                y={spec.braceY} />
            {spec.startOfSystem && <!Brace.Component
                idx={1}
                x={spec.x}
                y={spec.braceY}
                y2={spec.braceY2} />}
        </g>
    }
};

module BeginView {
    "use strict";
    export var Component = TypedReact.createClass(BeginView, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: BeginModel;
    }
}

export = BeginView;
