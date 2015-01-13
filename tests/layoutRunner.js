var Satie = require("../dist/satie");

var fs = require("fs")
var svg2png = require("svg2png");
var util = require('util');

function run(test, verbose, done) {
    var root = "./node_modules/musicxml-interfaces/tests/";
    if (test === "all") {
        var dir = fs.readdirSync(root);
    } else {
        var dir = [test + ".xml"];
    }
    var idx = -1;
    readNext();

    var completed = 0;
    function markCompleted() {
        ++completed;
        if (completed == dir.length) {
            done();
            return;
        }
    }

    function readNext() {
        ++idx;
        if (idx >= dir.length) {
            return;
        }

        if (!~dir[idx].indexOf(".xml")) {
            readNext();
            markCompleted();
            return;
        }
        console.log("\u001b[36mRendering " + dir[idx] + "...\u001b[39m");
        var svgPath = "./tests/out/" + dir[idx].replace("xml", "svg");
        var pngPath = "./tests/out/" + dir[idx].replace("xml", "png");

        var data = fs.readFileSync(root + dir[idx], "utf8");
        var score = Satie.MusicXML.parseXML(data);
        if (score.error) {
            if (verbose) {
                console.log(score.error);
            }
            readNext();
            markCompleted();
            return;
        }
        if (fs.existsSync(svgPath)) {
            fs.unlinkSync(svgPath);
        }
        if (fs.existsSync(pngPath)) {
            fs.unlinkSync(pngPath);
        }
        Satie.toSVG(score, function onSuccess(result) {
            fs.writeFile(svgPath, result, writePNG);
            function writePNG() {
                svg2png(svgPath, pngPath, writePNGDone);
                readNext();
            }
            function writePNGDone(err) {
                if (err && verbose) {
                    console.log(err);
                }
                markCompleted();
            }
        }, function onError(result) {
            if (verbose) {
                console.log(result);
            }
            readNext();
            markCompleted();
        });
    }
}

module.exports = run;
