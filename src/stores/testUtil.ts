/**
 * @file Utilities to be used for writing tests.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

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
            var opts = {
                indent: 15,
                staves: parsed,
                staveIdx: 0
            };
            context = new Context(opts);
            context.annotate(null);
            context = new Context(opts);
        });
        _.each(tests, test => it(
            test[0],
            () => parsed && context && test[1](parsed, context)));
    });
}