/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

class NewPageBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
        cursor.y = 0;

        cursor.pageLines = _.clone(cursor.pageLines);
        cursor.pageLines.push(cursor.line + 1);

        cursor.pageStarts = _.clone(cursor.pageStarts);
        cursor.pageStarts.push(idx);
        return true;
    }
    visible() {
        return false;
    }
    toLylite(lylite) {
        if (!this["_annotated"]) {
            lylite.push("\\pageBreak");
        }
    }
}

NewPageBridge.prototype.prereqs = [
];

var createNewPage = (cursor, stave, idx) => {
    stave.body.splice(idx, 0,
        new NewPageBridge({newpage: true, _annotated: "createNewPage"}));
    for (var i = idx + 1; i < stave.body.length; ++i) {
        if (stave.body[i].newpage && stave.body[i]["_annotated"]) {
            stave.body.splice(i, 1);
            --i;
        }
    }
    return -1;
};

module.exports = NewPageBridge;
module.exports.createNewPage = createNewPage;