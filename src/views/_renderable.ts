/**
 * Mixin for a primitive component that can be rendered via GLES or SVG.
 */

import renderUtil = require("../util/renderUtil");

class Renderable {
    render() {
        if (renderUtil.useGL) {
            return (<any>this).renderGL();
        } else {
            return (<any>this).renderSVG();
        }
    }
}

export = Renderable;
