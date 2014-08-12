// Type definitions for lylite (lylite.jison)

import Model = require("./model");

declare module lylite {
    var parser : {
        parse(src: string): any;
    }
}

export = lylite;