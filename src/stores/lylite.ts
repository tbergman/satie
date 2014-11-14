/**
 * @file Type definitions for lylite (lylite.jison)
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import C = require("./contracts");

export function parse(src: string): { parts: Array<C.IPart>; header: C.IHeader; } {
    "use strict";
    var lylite = require("./lylite.jison");
    return lylite.parser.parse(src);
}