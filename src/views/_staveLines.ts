/**
 * Renders the (usually 5) lines that make up a stave.
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");

import Group = require("./_group");
import Line = require("./_line");
import SMuFL = require("../util/SMuFL");

class StaveLines extends ReactTS.ReactComponentBase<StaveLines.IProps, {}> {
    render() {
        return Group(null,
            _.times(5, i => Line.Component({
                key: "staff-" + i,
                x1: this.props.x,
                x2: this.props.x + this.props.width,
                y1: this.props.y - 0.25*(i - 2),
                y2: this.props.y - 0.25*(i - 2),
                stroke: "#6A6A6A",
                victoriaXStrokeWidthFactor: 0,
                strokeWidth: SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness/4}))
        );
    }

    getDefaultProps() {
        return {
            width: 300
        };
    }
}

module StaveLines {
    export var Component = ReactTS.createReactComponent(StaveLines);

    export interface IProps {
        width: number;
        x: number;
        y: number;
    }
}

export = StaveLines;