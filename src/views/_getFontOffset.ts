/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import _            = require("lodash");
import assert   	= require("assert");

import C        	= require("../stores/contracts");

var    getAnchor    = _.memoize((notehead: string) =>
                        (<any>C.SMuFL.bravuraMetadata.glyphsWithAnchors)[notehead]);

/**
 * Used as a sort of "mixin" to calculate where an annotation of a note
 * should begin based on the direction of the note stem and the type of
 * annotation.
 */
function getFontOffset(notehead?: string, directionMult?: number) {
    "use strict";
    notehead        = notehead || this.props.notehead;
    var dm      	= directionMult || 1;
    var anchors 	= getAnchor(notehead);

    switch (true) {
        case !anchors:
            return [0, 0];
        case this.direction()*dm === 1:
            return anchors.stemUpSE  || anchors.stemUpNW;
        case this.direction()*dm === -1:
            return anchors.stemDownNW || anchors.stemDownSW;
        default:
            assert(false, "Invalid direction");
    }
}

export = getFontOffset;
