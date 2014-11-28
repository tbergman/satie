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

import _ = require("lodash");

export import bravuraMetadata = require("./bravura_metadata");
export var glyphClasses = require("./classes.json");
export var glyphNames = require("./glyphnames_diet.json");

export var bravuraBBoxes: {[key:string]: {bBoxNE: Array<number>; bBoxSW: Array<number>;};} =
    <any> _.indexBy(bravuraMetadata.glyphBBoxes, "name");
export function getGlyphCode(name: string) {
    "use strict";
    if (!(name in this.glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return String.fromCharCode(parseInt(
        this.glyphNames[name].substring(2), 16));
}

export var distances = {
    beam: 0.88
};