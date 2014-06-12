/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var React = require("react");

var NewPageBridge = require("./newpageBridge.jsx");
var StaveLines = require("../primitives/staveLines.jsx");
var renderUtil = require("./util.jsx");

var _ = require("underscore");

class NewlineBridge extends Bridge {
    prereqs() {
        return [
            [
                (obj, cursor) => cursor.y + cursor.lineSpacing < cursor.maxY,
                NewPageBridge.createNewPage,
                "Pages should not overflow"
            ],
            [
                // This requirement should be last so that it only happens once
                // per line.
                (obj, cursor) => cursor.maxX - cursor.x <= 0.01,
                this.justify.bind(this),
                "Notes should be full justfied within a line."
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        obj._fontSize = cursor.fontSize;
        obj._lineSpacing = cursor.lineSpacing;
        obj._pageSize = cursor.pageSize;

        cursor.x = cursor.initialX;
        cursor.y += cursor.lineSpacing;
        cursor.prevClef = cursor.clef;
        cursor.prevKeySignature = cursor.keySignature;
        cursor.smallest = 10000;
        delete cursor.clef;
        delete cursor.keySignature;

        ////////////////////////////////////////
        ++cursor.line;
        ////////////////////////////////////////

        if (!cursor.lines[cursor.line]) {
            cursor.lines[cursor.line] = {
                line: cursor.line,
            };
        }

        cursor.lines[cursor.line].accidentals = [];
        cursor.lines[cursor.line].all = [];
        cursor.lines[cursor.line].barlineX = [];
        cursor.lines[cursor.line].beats = 0;
        cursor.lines[cursor.line].x = cursor.x;
        cursor.lines[cursor.line].y = cursor.y;
        cursor.lines[cursor.line].pageLines = cursor.pageLines;
        cursor.lines[cursor.line].pageStarts = cursor.pageStarts;
        cursor.lines[cursor.line].keySignature = cursor.prevKeySignature;

        var Renderer = require("./renderer.jsx");
        Renderer.snapshot(cursor);

        return true;
    }
    render(obj, engine) {
        return <StaveLines
                key={this.key(obj)}
                width={renderUtil.mm(obj._pageSize.width - 30, obj._fontSize)}
                x={renderUtil.mm(15, obj._fontSize)}
                y={this.y(obj) + obj._lineSpacing} />;
    }
    justify(obj, cursor, stave, idx) {
        var diff = cursor.maxX - cursor.x;
        var l = 0;
        for (var i = idx - 1; i >= 0; --i) {
            if (stave.body[i].pitch || stave.body[i].chord) {
                ++l;
            }
            if (stave.body[i].newline) {
                break;
            }
        }
        diff -= 0.001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (var i = idx - 1; i >= 0; --i) {
            if (stave.body[i].newline) {
                break;
            }
            if (stave.body[i].pitch || stave.body[i].chord) {
                stave.body[i]["$PitchBridge_annotatedExtraWidth"] =
                    (stave.body[i]["$PitchBridge_annotatedExtraWidth"] || 0) +
                    diff/l;
                xOffset -= diff/l;
            }
            var newX = this.x(stave.body[i]) + xOffset;
            if (stave.body[i].barline && (!stave.body[i + 1] || !stave.body[i + 1].newline)) {
                if (cursor.lines[cursor.line - 1] && _(cursor.lines[cursor.line - 1].barlineX)
                        .any(x => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && !stave.body[j].barline; --j) {
                        if (stave.body[j].pitch || stave.body[j].chord) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && !stave.body[j].barline; --j) {
                        this.setX(stave.body[j], this.x(stave.body[j]) + remaining);
                        if (stave.body[j].pitch || stave.body[j].chord) {
                            remaining -= offset/noteCount;
                        }
                    }

                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < stave.body.length && !stave.body[j].barline; ++j) {
                        if (stave.body[j].pitch || stave.body[j].chord) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < stave.body.length && !stave.body[j].barline; ++j) {
                        this.setX(stave.body[j], this.x(stave.body[j]) + remaining);
                        if (stave.body[j].pitch || stave.body[j].chord) {
                            remaining -= offset/noteCount;
                        }
                    }
                }

                cursor.barlineX.push(newX);
            }
            this.setX(stave.body[i], newX);
        }
        return true;
    }
    toLylite(obj, lylite) {
        lylite.push("\n");
    }
}

var createNewline = (obj, cursor, stave, idx) => {
    var l = 0;
    var fidx = idx;
    for (fidx = idx; fidx >=0; --fidx) {
        delete stave.body[fidx]["$PitchBridge_annotatedExtraWidth"];
        if (stave.body[fidx].barline) {
            break;
        }
    }
    if (stave.body[fidx + 1].newpage) {
        return true;
    }
    for (var i = idx + 1; i < stave.body.length; ++i) {
        if (stave.body[i]._annotated) {
            if (stave.body[i].newline ||
                    stave.body[i].clef ||
                    stave.body[i].timeSignature ||
                    stave.body[i].keySignature) {
                stave.body.splice(i, 1);
                --i;
            }
        }
    }
    stave.body.splice(fidx + 1, 0, {newline: true, _annotated: "createNewline"});
    removeNextNewline(cursor, stave, fidx + 2);
    return "line_created";
};

var removeNextNewline = (cursor, stave, idx) => {
    for (var i = idx; i < stave.body.length; ++i) {
        if (stave.body[i].newline) {
            stave.body.splice(i, 1);
            for (var j = i; j < stave.body.length && !stave.body[j].beam &&
                    !stave.body[j].pitch && !stave.body[j].chord; ++j) {
                if (stave.body[j]._annotated) {
                    stave.body.splice(j, 1);
                    --j;
                }
            }
            return;
        }
    }
    return;
};

/**
 * Given an incomplete line ending at idx, spreads out the line
 * comfortably.
 */
var semiJustify = (cursor, stave, idx) => {
    var n = 0;
    for (var i = idx; i >= 0 && !stave.body[i].newline; --i) {
        if (stave.body[i].pitch || stave.body[i].chord) {
            ++n;
        }
    }
    if (n) {
        var lw = cursor.maxX - 3 - stave.body[idx]["$Bridge_x"];
        var nw = lw/n;
        var weight = renderUtil.sigmoid((nw - cursor.maxX/2)/20)*2/3;
        nw = (1 - weight)*nw;
        lw = nw * n;
        for (var i = idx; i >= 0 && !stave.body[i].newline; --i) {
            if (stave.body[i].pitch || stave.body[i].chord) {
                lw -= nw;
            }
            stave.body[i]["$Bridge_x"] += lw;
        }
    }
};

module.exports = NewlineBridge;
module.exports.createNewline = createNewline;
module.exports.semiJustify = semiJustify;
module.exports.removeNextNewline = removeNextNewline;
