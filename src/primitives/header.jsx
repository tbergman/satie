/**
 * @jsx React.DOM
 */

var React = require('react');

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
            fontSize: this.props.fontSize + "px"
        };

        return <g style={style}>
            {model.title &&
                <text className="tn_"
                    style={{textAnchor: "middle"}}
                    x={this.props.middle + "em"}
                    y={2 + "em"} >
                        {model.title}
                </text>
            }
            {model.composer &&
                <text className="tn_"
                    style={{textAnchor: "end", fontSize: 0.75 + "em"}}
                    x={this.props.right + "em"}
                    y={3/0.75 + "em"}>
                        {model.composer}
                </text>
            }
        </g>;
    }
});

var getHeight = header => {
    var height = 0;
    if (header.title) {
        height += 2;
    }
    if (header.composer) {
        height += 0.75;
    }
    return height;
};

module.exports = Header;
module.exports.getHeight = getHeight;
