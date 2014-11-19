/**
 * Renders the (usually 5) lines that make up a stave.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");

import Group = require("./_group");
import Line = require("./_line");
import SMuFL = require("../util/SMuFL");

class StaveLines extends TypedReact.Component<StaveLines.IProps, {}> {
    render() {
        return <!Group.Component>
            {_.times(5, i => <!Line.Component
                key={"staff-" + i}
                x1={this.props.x}
                x2={this.props.x + this.props.width}
                y1={this.props.y - 0.25*(i - 2)}
                y2={this.props.y - 0.25*(i - 2)}
                stroke="#6A6A6A"
                victoriaXStrokeWidthFactor={0}
                strokeWidth={SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness/4} />)}
        </Group.Component>;
    }

    getDefaultProps() {
        return {
            width: 300
        };
    }
}

module StaveLines {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, StaveLines);

    export interface IProps {
        width: number;
        x: number;
        y: number;
    }
}

export = StaveLines;