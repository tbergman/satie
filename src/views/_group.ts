/**
 * Renders a group with up to 6 children.
 */

import React = require("react");

var Victoria = require("../renderer/victoria/victoria");
import renderUtil = require("../util/renderUtil");

var VG = Victoria.VG;

function Group(a: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    "use strict";
    if (renderUtil.useGL) {
        return VG(a, b, c, d, e, f);
    } else {
        return React.DOM.g(a, b, c, d, e, f);
    }
}

export = Group;