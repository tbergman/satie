/**
 * Utilities for interacting with SMuFL-format musical fonts.
 *
 * SMuFL is a specification that provides a standard way of mapping
 * the thousands of musical symbols required by conventional music
 * notation into the Private Use Area in Unicode’s Basic Multilingual
 * Plane for a single (format-independent) font.
 *
 * See http://smufl.org for more details.
 */
var _ = require("lodash");

var bravuraMetadata = require("./bravura_metadata.json");
var glyphClasses = require("./classes.json");
var glyphNames = require("./glyphnames_diet.json");

module.exports = {
    glyphNames: glyphNames,
    glyphClasses: glyphClasses,
    bravuraMetadata: bravuraMetadata,
    bravuraBBoxes: _.indexBy(bravuraMetadata.glyphBBoxes, "name"),
    getGlyphCode: function(name) {
        if (!(name in this.glyphNames)) {
            console.warn(name, " is not a valid glyph");
        }
        return String.fromCharCode(parseInt(
            this.glyphNames[name].substring(2), 16));
    }
};
