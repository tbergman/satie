/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import TypedReact   = require("typed-react");

import C            = require("../stores/contracts");
import Model        = require("../stores/model");

class PureModelViewMixin extends TypedReact.Mixin<{spec: Model}, {}> {
    _hash: number;
    shouldComponentUpdate(nextProps: {spec: Model}, nextState: {}) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps) + nextProps.spec.x*9973 + nextProps.spec.y*997;
        return oldHash !== this._hash;
    }
}

var Mixin = TypedReact.createMixin(PureModelViewMixin);

export = Mixin;