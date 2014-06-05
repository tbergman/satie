var _ = require("underscore");

var bravuraMetadata = require("./bravura_metadata.json");
var glyphClasses = require("./classes.json");
var glyphNames = require("./glyphnames_diet.json");

module.exports = {
    glyphNames: glyphNames,
    glyphClasses: glyphClasses,
    bravuraMetadata: bravuraMetadata,
    bravuraBBoxes: _(bravuraMetadata.glyphBBoxes).indexBy("name"),
    getGlyphCode: function(name) {
        if (!(name in this.glyphNames)) {
            console.warn(name, " is not a valid glyph");
        }
        return String.fromCharCode(parseInt(
            this.glyphNames[name].substring(2), 16));
    }
};
