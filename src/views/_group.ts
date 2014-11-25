/**
 * Renders a group with up to 6 children.
 */

import TypedReact=require("typed-react");
import React = require("react");

var Victoria = require("../renderer/victoria/victoria");
import renderUtil = require("../util/renderUtil");

var VG = Victoria.VG;

class Group extends TypedReact.Component<any, any> {
    render() {
        var x = (renderUtil.useGL ? VG : React.DOM.g).apply(null, [this.props].concat(this.props.children));
        console.assert(x);
        return x;
    }
}

module Group {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Group);
}

export = Group;
