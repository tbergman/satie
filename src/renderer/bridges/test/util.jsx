var Context = require("../../../stores/context.jsx");
var lylite = require("../../lylite.jison").parser;

module.exports = {
    parseAnnotateTest: function (desc, ly, tests) {
        describe(desc, function() {
            var parsed;
            var context;
            it("should be parsable", () => {
                parsed = lylite.parse(ly);
            });
            it("should be annotatable", () => {
                if (!parsed) {
                    return;
                }
                context = new Context({staves: parsed, staveIdx: 0});
                context.annotate();
                context = new Context({staves: parsed, staveIdx: 0});
            });
            tests.forEach(test => it(test[0], () => parsed && context && test[1](parsed, context)));
        });
    }
};
