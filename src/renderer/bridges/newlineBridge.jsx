/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var React = require("react");

var NewPageBridge = require("./newpageBridge.jsx");
var StaveLines = require("../primitives/staveLines.jsx");
var renderUtil = require("../util.jsx");

var _ = require("underscore");

class NewlineBridge extends Bridge {
    annotateImpl(ctx) {
        this._fontSize = ctx.fontSize;
        this._lineSpacing = ctx.lineSpacing;
        this._pageSize = ctx.pageSize;

        ctx.x = ctx.initialX;
        ctx.y += ctx.lineSpacing;
        ctx.prevClef = ctx.clef;
        ctx.prevKeySignature = ctx.keySignature;
        ctx.smallest = 10000;
        delete ctx.clef;
        delete ctx.keySignature;

        ////////////////////////////////////////
        ++ctx.line;
        ////////////////////////////////////////

        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                line: ctx.line,
            };
        }

        ctx.lines[ctx.line].accidentals = [];
        ctx.lines[ctx.line].all = [];
        ctx.lines[ctx.line].bar = ctx.bar;
        ctx.lines[ctx.line].barlineX = [];
        ctx.lines[ctx.line].beats = 0;
        ctx.lines[ctx.line].x = ctx.x;
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].pageLines = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts = ctx.pageStarts;
        ctx.lines[ctx.line].keySignature = ctx.prevKeySignature;

        var SongEditorStore = require("../../stores/songEditor.jsx");
        SongEditorStore.snapshot(ctx);

        return true;
    }
    render() {
        return <StaveLines
                key={this.key()}
                width={renderUtil.mm(this._pageSize.width - 30, this._fontSize)}
                x={renderUtil.mm(15, this._fontSize)}
                y={this.y() + this._lineSpacing} />;
    }
    justify(ctx) {
        var diff = ctx.maxX - ctx.x;
        var l = 0;
        for (var i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].pitch || ctx.body[i].chord) {
                ++l;
            }
            if (ctx.body[i].newline) {
                break;
            }
        }
        diff -= 0.001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (var i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].newline) {
                break;
            }
            if (ctx.body[i].pitch || ctx.body[i].chord) {
                ctx.body[i].annotatedExtraWidth =
                    (ctx.body[i].annotatedExtraWidth || 0) +
                    diff/l;
                xOffset -= diff/l;
            }
            var newX = ctx.body[i].x() + xOffset;
            if (ctx.body[i].barline && (!ctx.body[i + 1] || !ctx.body[i + 1].newline)) {
                if (ctx.lines[ctx.line - 1] && _(ctx.lines[ctx.line - 1].barlineX)
                        .any(x => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && !ctx.body[j].barline; --j) {
                        if (ctx.body[j].pitch || ctx.body[j].chord) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && !ctx.body[j].barline; --j) {
                        ctx.body[j].setX(ctx.body[j].x() + remaining);
                        if (ctx.body[j].pitch || ctx.body[j].chord) {
                            remaining -= offset/noteCount;
                        }
                    }

                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && !ctx.body[j].barline; ++j) {
                        if (ctx.body[j].pitch || ctx.body[j].chord) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && !ctx.body[j].barline; ++j) {
                        ctx.body[j].setX(ctx.body[j].x() + remaining);
                        if (ctx.body[j].pitch || ctx.body[j].chord) {
                            remaining -= offset/noteCount;
                        }
                    }
                }

                ctx.barlineX.push(newX);
            }
            ctx.body[i].setX(newX);
        }
        return true;
    }
    toLylite(lylite) {
        lylite.push("\n");
    }
}

var createNewline = (ctx) => {
    var l = 0;
    var fidx = ctx.idx;
    for (; fidx >=0; --fidx) {
        ctx.body[fidx].annotatedExtraWidth = undefined;
        if (ctx.body[fidx].barline) {
            break;
        }
    }
    if (ctx.body[fidx + 1].newpage) {
        return true;
    }
    for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
        if (ctx.body[i]._annotated) {
            if (ctx.body[i].newline ||
                    ctx.body[i].clef ||
                    ctx.body[i].timeSignature ||
                    ctx.body[i].keySignature) {
                ctx.eraseFuture(i);
                --i;
            }
        }
    }
    ctx.insertPast(new NewlineBridge({newline: true, _annotated: "createNewline"}), fidx + 1);
    removeNextNewline(ctx, fidx + 2);
    return "line_created";
};

var removeNextNewline = (ctx, start) => {
    for (var i = start; i < ctx.body.length; ++i) {
        if (ctx.body[i].newline) {
            ctx.body.splice(i, 1);
            for (var j = i; j < ctx.body.length && !ctx.body[j].beam &&
                    !ctx.body[j].pitch && !ctx.body[j].chord; ++j) {
                if (ctx.body[j]._annotated) {
                    ctx.eraseFuture(j);
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
var semiJustify = (ctx) => {
    var fullJustify = false;
    if (typeof window !== "undefined" &&
            global.location.href.indexOf("/scales/") !== -1) {
        // XXX: HACK!!!
        fullJustify = true;
    }
    var n = 0;
    for (var i = ctx.idx; i >= 0 && !ctx.body[i].newline; --i) {
        if (ctx.body[i].pitch || ctx.body[i].chord) {
            ++n;
        }
    }
    if (n) {
        var lw = ctx.maxX - 3 - ctx.curr().x();
        var nw = lw/n;
        if (fullJustify) {
            lw = ctx.maxX - ctx.curr().x();
            nw = lw/n;
        } else {
            var weight = renderUtil.sigmoid((nw - ctx.maxX/2)/20)*2/3;
            nw = (1 - weight)*nw;
            lw = nw * n;
        }
        for (var i = ctx.idx; i >= 0 && !ctx.body[i].newline; --i) {
            if (ctx.body[i].pitch || ctx.body[i].chord) {
                lw -= nw;
            }
            ctx.body[i]["$Bridge_x"] += lw;
        }
    }
};

NewlineBridge.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.y + ctx.lineSpacing < ctx.maxY; },
        NewPageBridge.createNewPage,
        "Pages should not overflow"
    ],
    [
        // This requirement should be last so that it only happens once
        // per line.
        function(ctx) {
            return ctx.maxX - ctx.x <= 0.01; },
        function(ctx) {
            return this.justify(ctx); },
        "Notes should be full justfied within a line."
    ]
];

module.exports = NewlineBridge;
module.exports.createNewline = createNewline;
module.exports.semiJustify = semiJustify;
module.exports.removeNextNewline = removeNextNewline;
