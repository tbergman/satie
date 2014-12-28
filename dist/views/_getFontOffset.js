var _ = require("lodash");
var assert = require("assert");
var C = require("../stores/contracts");
var getAnchor = _.memoize(function (notehead) { return C.SMuFL.bravuraMetadata.glyphsWithAnchors[notehead]; });
function getFontOffset(notehead, directionMult) {
    "use strict";
    notehead = notehead || this.props.notehead;
    var dm = directionMult || 1;
    var anchors = getAnchor(notehead);
    switch (true) {
        case !anchors:
            return [0, 0];
        case this.direction() * dm === 1:
            return anchors.stemUpSE || anchors.stemUpNW;
        case this.direction() * dm === -1:
            return anchors.stemDownNW || anchors.stemDownSW;
        default:
            assert(false, "Invalid direction");
    }
}
module.exports = getFontOffset;
