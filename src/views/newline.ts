/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");

import Brace                = require("./_brace");
import C                    = require("../stores/contracts");
import NewlineModel         = require("../stores/newline");
import PureModelViewMixin   = require("./pureModelViewMixin");
import StaveLines           = require("./_staveLines");

/**
 * Appears at the very beginning of a line, except the first line.
 *
 * See also BeginModel and BeginView.
 */
class NewlineView extends TypedReact.Component<NewlineView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return <!g>
            <!StaveLines.Component
                key="StaveLines"
                width={this.props.spec.width}
                x={spec.x}
                y={spec.braceY + spec.lineSpacing} />
        </g>;

        // {spec.pianoSystemContinues && <!Brace.Component MXFIX
        //     idx={1}
        //     x={spec.x}
        //     fontSize={this.props.fontSize}
        //     y={spec.braceY + spec.lineSpacing}
        //     y2={spec.braceY2 + spec.lineSpacing} />}
    }
};


module NewlineView {
    "use strict";
    export var Component = TypedReact.createClass(NewlineView, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: NewlineModel;
    }
}

export = NewlineView;
