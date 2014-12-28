/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React            = require("react");
import TypedReact       = require("typed-react");

import C                = require("../stores/contracts");

/**
 * Renders the title, author, etc. of a song.
 * Unlike other primitives, this one decides the position of its children.
 */
class Header extends TypedReact.Component<Header.IProps, {}> {
    render() {
        this._editNodes = [];

        var model: C.ScoreHeader = this.props.model;
        var editMode = this.getEditMode();
        var style = {
            fontSize: this.props.fontSize + "px"
        };

        return React.DOM.g({style: style},
            model.credits.map((credit, idx) =>
                React.DOM.g({key: "w_" + idx},
                    credit.creditWords.map((editMode ? this.getEditNode : getViewNode).bind(this, this._editNodes, credit))
                )
            )
        );

        function toCSS(justification: C.MusicXML.LeftCenterRight) {
            switch(justification) {
                case C.MusicXML.LeftCenterRight.Left:
                    return "start";
                case C.MusicXML.LeftCenterRight.Center:
                    return "middle";
                case C.MusicXML.LeftCenterRight.Right:
                    return "end";
            }
        }

        function getViewNode(editNodes: Header.INode[], credit: C.MusicXML.Credit, words: C.MusicXML.CreditWords, idx: number) {
            editNodes[idx] = null;
            return React.DOM.text(
                {
                    key: "credit_" + idx,
                    className: "tn_",
                    "data-selection-info": "header_" + credit.creditTypes.join("_") + "_" + idx,
                    style: {
                        textAnchor: toCSS(words.justify)
                    },
                    x: (words.defaultX + (words.relativeX || 0)),
                    y: (words.defaultY + (words.relativeY || 0)),
                    fontSize: C.renderUtil.cssSizeToTenths(this.props.fontSize, words.fontSize)
                },
                words.words
            );
        }
    }

    getEditMode(): string {
        return null;
    }
    getEditNode(editNodes: Header.INode[], credit: C.MusicXML.Credit,
            words: C.MusicXML.CreditWords, idx: number): any {
        return null;
    }

    componentDidMount() {
        this._renderForeigns();
    }

    componentDidUpdate() {
        this._renderForeigns();
    }

    componentWillReceiveProps(nextProps: Header.IProps) {
        this._removeOldForeigns(nextProps.model.credits.length);
    }

    componentWillUnmount() {
        this._removeOldForeigns(0);
    }

    private _renderForeigns() {
        for (var i = 0; i < this._editNodes.length; ++i) {
            var node = this._editNodes[i];
            if (node) {
                var words = node.words;
                React.render(
                    React.DOM.input({
                        type:               "text",
                        className:          "form-control",
                        id:                 "newsong_title",
                        placeholder:        "",
                        onChange: (event: React.SyntheticEvent) => this.setState({
                            composer:       (<HTMLInputElement>event.target).value
                        }),
                        value:              words.words
                    }),
                    this.refs[node.ref].getDOMNode().firstElementChild.firstElementChild
                );
            }
        }
    }

    private _removeOldForeigns(i: number) {
        for (; i < this._editNodes.length; ++i) {
            var node = this._editNodes[i];
            if (node) {
                React.unmountComponentAtNode(
                    this.refs[node.ref].getDOMNode().firstElementChild.firstElementChild
                );
            }
        }
    }

    _uuid: string           = C.generateUUID();
    _listeners: any[]       = [];
    _hash: number;
    _editNodes: Header.INode[];
    shouldComponentUpdate(nextProps: Header.IProps, nextState: {}) {
        var oldHash             = this._hash;
        this._hash              = C.JSONx.hash(nextProps);

        return oldHash !== this._hash;
    }
}

module Header {
    "use strict";
    export var Component = TypedReact.createClass(Header);

    export interface INode {
        credit:         C.MusicXML.Credit;
        words:          C.MusicXML.CreditWords;
        ref:            string;
    }

    export interface IProps {
        editMode:   boolean;
        fontSize:   number;
        model:      C.ScoreHeader;
    }
}

export = Header;
