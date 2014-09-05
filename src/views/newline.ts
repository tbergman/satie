/**
 * Appears at the very begining of a line, except the first line.
 * See also begin.jsx.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import NewlineModel = require("../stores/newline");
var StaveLines = require("./_staveLines.jsx");

export class NewlineView extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;

        return StaveLines({
                key: spec.key,
                width: spec.width,
                x: spec.begin,
                y: spec.y() + spec.lineSpacing});
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