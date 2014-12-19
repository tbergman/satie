/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React            = require("react");
import TypedReact       = require("typed-react");

import C                = require("../stores/contracts");
import Tool             = require("../stores/tool");
import TextTool         = require("../stores/textTool");

/**
 * Renders the title, author, etc. of a song.
 * Unlike other primitives, this one decides the position of its children.
 */
class Header extends TypedReact.Component<Header.IProps, {}> {
    render() {
        this._editNodes = [];

        var model: C.ScoreHeader = this.props.model;
        var editMode = this.props.editMode && !!this.props.tool.instance(TextTool);
        var style = {
            fontSize: this.props.fontSize + "px"
        };

        return React.DOM.g({style: style},
            model.credits.map((credit, idx) =>
                React.DOM.g({key: "w_" + idx},
                    credit.creditWords.map((editMode ? getEditNode : getViewNode).bind(this, this._editNodes, credit))
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

        function getEditNode(editNodes: IEditNode[], credit: C.MusicXML.Credit, words: C.MusicXML.CreditWords, idx: number) {
            var width                   = 200;
            var height      			= 80;
            editNodes[idx] = {
                ref:    "_foreign_" + idx,
                credit: credit,
                words:  words
            };
            return React.DOM.g(
                {
                    key:                "_" + idx,
                    ref:                "_foreign_" + idx,
                    x:                  (words.defaultX + (words.relativeX || 0)) - width/2,
                    y:      			(words.defaultY + (words.relativeY || 0)) - height/2,
                    width:  			width,
                    height: 			height,
                    fontSize:   		C.renderUtil.cssSizeToTenths(this.props.fontSize, words.fontSize),
                    dangerouslySetInnerHTML: {
                        __html:         "<foreignObject" +
                            " x=" +         parseFloat(<any>((words.defaultX + (words.relativeX || 0)) - width/2)) +
                            " y=" +     	parseFloat(<any>((words.defaultY + (words.relativeY || 0)) - height/2)) +
                            " width=" + 	parseFloat(<any>width) +
                            " height=" +	parseFloat(<any>height) +
                        "><xhtml:body id=\"_credits_" + this._uuid + "_" + idx + "\"></xhtml:body></foreignObject>"
                    }
                }
                // React.DOM.createElement("body", {xmlns: "http://www.w3.org/1999/xhtml"},
                // React.DOM.input({
                //     type:       		"text",
                //     className:  		"form-control",
                //     id:         		"newsong_title",
                //     placeholder:        "",
                //     onChange: (event: React.SyntheticEvent) => this.setState({
                //         composer:       (<HTMLInputElement>event.target).value
                //     }),
                //     value:              words.words
                // })
                // )
            );
        }

        function getViewNode(editNodes: IEditNode[], credit: C.MusicXML.Credit, words: C.MusicXML.CreditWords, idx: number) {
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
                        type:       		"text",
                        className:  		"form-control",
                        id:         		"newsong_title",
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
    _editNodes: IEditNode[];
    shouldComponentUpdate(nextProps: Header.IProps, nextState: {}) {
        var oldHash             = this._hash;
        this._hash              = C.JSONx.hash(nextProps);

        return oldHash !== this._hash;
    }
}

module Header {
    "use strict";
    export var Component = TypedReact.createClass(Header);
    export interface IProps {
        editMode:   boolean;
        fontSize:   number;
        model:      C.ScoreHeader;
        tool:       Tool;
    }
}

interface IEditNode {
    credit:         C.MusicXML.Credit;
    words:  	   	C.MusicXML.CreditWords;
    ref:            string;
}

export = Header;
