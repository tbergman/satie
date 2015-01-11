var _ = require("lodash");
exports.bravuraMetadata = require("./bravura_metadata");
var glyphNames = require("./glyphnames_diet");
exports.bravuraBBoxes = _.indexBy(exports.bravuraMetadata.glyphBBoxes, 4);
function getGlyphCode(name) {
    "use strict";
    if (!(name in glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return String.fromCharCode(parseInt(glyphNames[name].substring(2), 16));
}
exports.getGlyphCode = getGlyphCode;
exports.distances = {
    beam: 0.88
};
