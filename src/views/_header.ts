/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
import renderUtil = require("../util/renderUtil");

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
            fontSize: renderUtil.FONT_SIZE_FACTOR*this.props.fontSize + "px"
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
                                x: this.props.middle*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR,
                                y: 2*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR
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
                    return "left";
                case C.MusicXML.LeftCenterRight.Center:
                    return "middle";
                case C.MusicXML.LeftCenterRight.Right:
                    return "right";
            }
        }
        // model.movementTitle &&
        //     React.DOM.text({className: "tn_ " + (editMode ? "svgLink" : ""),
        //         "data-selection-info": "song_title",
        //         style: {textAnchor: "middle"},
        //         x: this.props.middle*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR,
        //         y: 2*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR},
        //             model.movementTitle
        //     ),

        // model.composer &&
        //     React.DOM.text({className: "tn_ " + (editMode ? "svgLink" : ""),
        //         "data-selection-info": "song_composer",
        //         style: {textAnchor: "end", fontSize: 0.75 + "em"},
        //         x: this.props.right*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR,
        //         y: 3/0.75*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR},
        //             model.composer
        //     )
    }
}

module Header {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Header);
    export interface IProps {
        fontSize: number;
        middle: number;
        model: C.ScoreHeader;
        right: number;
        tool: Tool;
    }
}

export = Header;
