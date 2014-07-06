/**
 * Used as a sort of "mixin" to calculate where an annotation of a note
 * should begin based on the direction of the note stem and the type of
 * annotation.
 *
 * @jsx React.DOM
 */

var _ = require("lodash");

var SMuFL = require("./SMuFL.js");

var getAnchor = _.memoize(notehead => SMuFL.bravuraMetadata.glyphsWithAnchors[notehead]);

function getFontOffset(notehead, directionMult) {
    notehead = notehead || this.props.notehead;
    var dm = directionMult || 1;

    var anchors = getAnchor(notehead);
    if (!anchors) {
        return [0, 0];
    }
    if (this.getDirection()*dm === 1) {
        return anchors.stemUpSE || anchors.stemUpNW;
    } else if (this.getDirection()*dm === -1) {
        return anchors.stemDownNW || anchors.stemDownSW;
    }
    console.assert(0);
}

module.exports = getFontOffset;
