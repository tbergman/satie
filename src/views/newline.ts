/**
 * Appears at the very begining of a line, except the first line.
 * See also begin.jsx.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import NewlineModel = require("../stores/newline");
var StaveLines = require("./_staveLines.jsx");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

export class NewlineView extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;

        return StaveLines({
                key: spec.key(),
                width: renderUtil.mm(spec.pageSize.width - 30, spec.fontSize),
                x: renderUtil.mm(15, spec.fontSize),
                y: spec.y() + spec.lineSpacing});
    }
};

export var Component = ReactTS.createReactComponent(NewlineView);

export interface IProps {
    key: string;
    spec: NewlineModel;
}

export interface IState {

}