import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");
import lylite = require("./lylite");

export function parseAnnotateTest(desc: string, ly: string, tests: Array<any[]>) {
    "use strict";

    describe(desc, function() {
        var parsed: Array<C.IStave>;
        var context: Context;
        it("should be parsable", () => {
            parsed = lylite.parse(ly);
        });
        it("should be annotatable", () => {
            if (!parsed) {
                return;
            }
            context = new Context({staves: parsed, staveIdx: 0});
            context.annotate(null);
            context = new Context({staves: parsed, staveIdx: 0});
        });
        _.each(tests, test => it(
            test[0],
            () => parsed && context && test[1](parsed, context)));
    });
}