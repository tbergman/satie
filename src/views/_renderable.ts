/**
 * Mixin for a primitive component that can be rendered via GLES or SVG.
 */

import C = require("../stores/contracts");

class Renderable {
    render() {
        if (C.renderUtil.useGL) {
            return (<any>this).renderGL();
        } else {
            return (<any>this).renderSVG();
        }
    }
}

export = Renderable;
