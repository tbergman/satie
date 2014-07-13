var express = require("express");
var bodyParser = require("body-parser");

module.exports = function (cb) {
    var app = express();
    app.use(bodyParser.json());
    cb(app);
};
