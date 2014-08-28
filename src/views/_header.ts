/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 *
 * @jsx React.DOM
 */

import React = require("react");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import C = require("../stores/contracts");

/**
 * Renders the title, author, etc. of a song.
 * Unlike other primitives, this one decides the position of its children.
 */
var Header = React.createClass({displayName: "Header",
    render: function() {
        var model: C.IHeader = this.props.model;
        var style = {
            fontSize: renderUtil.FONT_SIZE_FACTOR*this.props.fontSize + "px"
        };

        return React.DOM.g({style: style},
            model.title &&
                React.DOM.text({className: "tn_ " + (model.titleHovered ? "svgLink" : ""),
                    "data-selectioninfo": "song_title",
                    style: {textAnchor: "middle"},
                    x: this.props.middle*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR,
                    y: 2*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR},
                        model.title
                ),

            model.composer &&
                React.DOM.text({className: "tn_ " + (model.composerHovered ? "svgLink" : ""),
                    "data-selectioninfo": "song_composer",
                    style: {textAnchor: "end", fontSize: 0.75 + "em"},
                    x: this.props.right*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR,
                    y: 3/0.75*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR},
                        model.composer
                )

        );
    },

    propTypes: {
        fontSize: React.PropTypes.number.isRequired,
        middle: React.PropTypes.number.isRequired,
        model: React.PropTypes.object.isRequired,
        right: React.PropTypes.number.isRequired
    }
});

export = Header;
