/**
 * @file This code runs outside Browserify and passes a Node Express context into
 * code managed by Browserify.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

var express = require("express");
var bodyParser = require("body-parser");

module.exports = function (cb) {
    var app = express();
    app.use(bodyParser.json());
    cb(app);
};
