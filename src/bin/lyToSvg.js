var assert = require("assert");
var _ = require("lodash");

var Context = require("../stores/context.jsx");
var Header = require("../primitives/header.jsx");
var React = require("react");
var Renderer = require("../renderer/renderer.jsx");
var ScaleGenerator = require("../promos/scales/scaleGenerator.jsx");
var browserifySrv = require("./browserifySrv.js");
var lylite = require("../stores/models/lylite.jison").parser;
var renderUtil = require("ripienoUtil/renderUtil.jsx");
require("../webViews.jsx");

browserifySrv(function(app) {
    app.post("/scale.svg", function(req, res) {
        res.send(ScaleGenerator.lylite(req.body));
    });
    app.post("/to.svg", function(req, res) {
        assert(req && req.body && req.body.lylite, "Lylite must be defined");
        assert(typeof req.body.lylite === "string", "Lylite must be a string");

        var staves = lylite.parse(req.body.lylite);
        renderUtil.addDefaults(staves);

        var staveHeight = _.find(staves, function(s) { return s.staveHeight; }).staveHeight;
        var pageSize = _.find(staves, function(s) { return s.pageSize; }).pageSize;

        var y = 0;
        var contexts = [];
        contexts.length = staves.length;

        while (!staves.every(function(stave, sidx) {
            if (stave.header) {
                y += Header.getHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }
        
            var context = new Context({
                    top: y,
                    fontSize: staveHeight,
                    isFirstLine: true,
                    pageSize: pageSize,
                    staves: staves,
                    staveIdx: sidx
                });

            var info = context.annotate({staveIdx: sidx});
            y = (info.resetY ? 0 : y) + (info.skip ? 0 : 2.25);
            contexts[sidx] = context;

            return info.success;
        })) { /* pass */ }

        res.setHeader("Content-Type", "image/svg+xml");
        res.send('<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
            React.renderComponentToStaticMarkup(Renderer({
                contexts: contexts,
                pageSize: pageSize,
                raw: true,
                staveHeight: staveHeight,
                staves: staves
        })).replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" ")
           .replace(/class="mn_"/g, "font-family='bravura'")
           .replace(/class="tn_"/g, "font-family='Alegreya'"));
    });

    var server = app.listen(8002, function() {
        console.log("Listening on port 8002...");
    });
});
