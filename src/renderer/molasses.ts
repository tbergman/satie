/**
 * @file SVG renderer for sheet music.  See also victoria.js.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import ReactTS = require("react-typescript");

export class Molasses extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        return React.DOM.svg(
            {
                "data-page": this.props.page.idx,
                height: this.props.height,
                onClick: this.props.onClick,
                onMouseDown: this.props.onMouseDown,
                onMouseLeave: this.props.onMouseLeave,
                onMouseMove: this.props.onMouseMove,
                onMouseUp: this.props.onMouseUp,
                ref: "svg" + this.props.page.idx,
                viewBox: this.props.viewbox,
                width: this.props.width
            },
            this.props.children
        );
    }
};

export interface IProps {
    children?: Array<React.ReactComponent<any, any>>;
    /**
     * A unit such as "in" should be included.
     */
    height: string;
    onClick: (evt: React.MouseEvent) => void;
    onMouseDown: (evt: React.MouseEvent) => void;
    onMouseLeave: (evt: React.MouseEvent) => void;
    onMouseMove: (evt: React.MouseEvent) => void;
    onMouseUp: (evt: React.MouseEvent) => void;
    page: {
        idx: number;
    };
    viewbox: string;
    /**
     * A unit such as "in" should be included.
     */
    width: string;
}

export var Component = ReactTS.createReactComponent(Molasses);