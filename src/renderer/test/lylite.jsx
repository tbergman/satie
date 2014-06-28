var _ = require('underscore');
var assert = require("assert")

var lylite = require("../lylite.jison").parser;
var SongEditorStore = require("../../stores/songEditor.jsx");

describe("Lylite", function() {
    describe("piano staves", function() {
        var parsed;
        it("should parse", function() {
            parsed = lylite.parse(
                "\\new PianoStaff << " +
                "    \\new Staff { \\time 2/4 c4 e g g, } " +
                "    \\new Staff { \\clef bass c,, c' e c } " +
                ">>");
        });
        it("should be annotatable", function() {
            SongEditorStore.annotate(null, null, parsed, {width: 1000, height: 1000});
            //console.log(JSON.stringify(parsed));
        });
    });

    describe.skip("relative outside piano staves", function() {
        it("should parse", function() {
            var t = lylite.parse(
                "\\relative c'' {" +
                "\\new PianoStaff << " +
                "    \\new Staff { \\time 2/4 c4 e g g, } " +
                "    \\new Staff { \\clef bass c,, c' e c } " +
                ">>" +
                "}");
        });
    });
});
