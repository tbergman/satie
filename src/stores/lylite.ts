// Type definitions for lylite (lylite.jison)

import Model = require("./model");

export function parse(src: string) {
    var lylite = require("./lylite.jison");
    return lylite.parser.parse(src);
}