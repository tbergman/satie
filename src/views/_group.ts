/**
 * Renders a group with up to 6 children.
 */

import TypedReact=require("typed-react");
import React = require("react");

import C = require("../stores/contracts");
var Victoria = require("../renderer/victoria/victoria");

var VG = Victoria.VG;

class Group extends TypedReact.Component<any, any> {
    render() {
        var x = (C.renderUtil.useGL ? VG : React.DOM.g).apply(null, [this.props].concat(this.props.children));
        console.assert(x);
        return x;
    }
}

module Group {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Group);
}

export = Group;
