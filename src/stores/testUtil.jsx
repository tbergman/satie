var _ = require("lodash");

var Context = require("./context.ts");
var lylite = require("./lylite.jison");

module.exports = {
    parseAnnotateTest: function (desc, ly, tests) {
        describe(desc, function() {
            var parsed;
            var context;
            it("should be parsable", () => {
                parsed = lylite.parser.parse(ly);
            });
            it("should be annotatable", () => {
                if (!parsed) {
                    return;
                }
                context = new Context({staves: parsed, staveIdx: 0});
                context.annotate();
                context = new Context({staves: parsed, staveIdx: 0});
            });
            _.each(tests, test => it(test[0], () => parsed && context && test[1](parsed, context)));
        });
    }
};
