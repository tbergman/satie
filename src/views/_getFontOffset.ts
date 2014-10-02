/**
 * Used as a sort of "mixin" to calculate where an annotation of a note
 * should begin based on the direction of the note stem and the type of
 * annotation.
 *
 * @jsx React.DOM
 */

import _ = require("lodash");
import assert = require("assert");

var SMuFL = require("../util/SMuFL.ts");

var getAnchor = _.memoize(notehead => SMuFL.bravuraMetadata.glyphsWithAnchors[notehead]);

function getFontOffset(notehead?: string, directionMult?: number) {
    "use strict";
    notehead = notehead || this.props.notehead;
    var dm = directionMult || 1;

    var anchors = getAnchor(notehead);
    if (!anchors) {
        return [0, 0];
    }
    if (this.direction*dm === 1) {
        return anchors.stemUpSE || anchors.stemUpNW;
    } else if (this.direction*dm === -1) {
        return anchors.stemDownNW || anchors.stemDownSW;
    }
    assert(false, "Invalid direction");
}

export = getFontOffset;
