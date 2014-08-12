/**
 * Renders the title, author, etc. of a song.
 * Unlike other primitivies, this one decides the position of its children.
 *
 * @jsx React.DOM
 */

var React = require("react");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var Header = React.createClass({
    propTypes: {
        fontSize: React.PropTypes.number.isRequired,
        middle: React.PropTypes.number.isRequired,
        model: React.PropTypes.object.isRequired,
        right: React.PropTypes.number.isRequired
    },

    render: function() {
        var model = this.props.model;
        var style = {
            fontSize: renderUtil.FONT_SIZE_FACTOR*this.props.fontSize + "px"
        };

        return <g style={style}>
            {model.title &&
                <text className="tn_"
                    style={{textAnchor: "middle"}}
                    x={this.props.middle*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR}
                    y={2*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR} >
                        {model.title}
                </text>
            }
            {model.composer &&
                <text className="tn_"
                    style={{textAnchor: "end", fontSize: 0.75 + "em"}}
                    x={this.props.right*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR}
                    y={3/0.75*0.75*this.props.fontSize*renderUtil.FONT_SIZE_FACTOR}>
                        {model.composer}
                </text>
            }
        </g>;
    }
});

module.exports = Header;
