/**
 * Appears at the very beginning of a line, except the first line.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import NewlineModel = require("../stores/newline");
var Brace = require("./_brace.jsx");
var Group = require("./_group.jsx");
var StaveLines = require("./_staveLines.jsx");

export class NewlineView extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            spec.pianoStaff && Brace({
                x: spec.begin,
                fontSize: this.props.fontSize,
                y: spec.braceY + spec.lineSpacing,
                y2: spec.braceY2 + spec.lineSpacing}),
            StaveLines({
                key: "StaveLines",
                width: this.props.spec.width,
                x: spec.begin,
                y: spec.braceY + spec.lineSpacing})
        );
    }
};

export var Component = ReactTS.createReactComponent(NewlineView);

export interface IProps {
    key: number;
    spec: NewlineModel;
    fontSize: number;
}

export interface IState {

}