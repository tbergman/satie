/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import TypedReact = require("typed-react");

import C = require("../stores/contracts");
import Tool = require("../stores/tool");
import TextTool = require("../stores/textTool");

/**
 * Renders the title, author, etc. of a song.
 * Unlike other primitives, this one decides the position of its children.
 */
class Header extends TypedReact.Component<Header.IProps, {}> {
    render() {
        var model: C.ScoreHeader = this.props.model;
        var editMode = !!this.props.tool.instance(TextTool);
        var style = {
            fontSize: this.props.fontSize + "px"
        };

        return React.DOM.g({style: style},
            model.credits.map((credit, idx) =>
                React.DOM.g({key: "w_" + idx},
                    credit.creditWords.map((words, idx) =>
                        React.DOM.text(
                            {
                                key: "ww_" + idx,
                                className: "tn_" + (editMode ? "svgLink" : ""),
                                "data-selection-info": "header_" + credit.creditTypes.join("_") + "_" + idx,
                                style: {
                                    textAnchor: toCSS(words.justify)
                                },
                                x: (words.defaultX + (words.relativeX || 0)),
                                y: (words.defaultY + (words.relativeY || 0)),
                                fontSize: C.renderUtil.cssSizeToTenths(this.props.fontSize, words.fontSize)
                            },
                            words.words
                        )
                    )
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
    }
}

module Header {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Header);
    export interface IProps {
        fontSize: number;
        model: C.ScoreHeader;
        tool: Tool;
    }
}

export = Header;
