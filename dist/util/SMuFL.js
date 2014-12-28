var _ = require("lodash");
exports.bravuraMetadata = require("./bravura_metadata");
exports.glyphClasses = require("./classes.json");
exports.glyphNames = require("./glyphnames_diet.json");
exports.bravuraBBoxes = _.indexBy(exports.bravuraMetadata.glyphBBoxes, 4);
function getGlyphCode(name) {
    "use strict";
    if (!(name in this.glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return String.fromCharCode(parseInt(this.glyphNames[name].substring(2), 16));
}
exports.getGlyphCode = getGlyphCode;
exports.distances = {
    beam: 0.88
};
