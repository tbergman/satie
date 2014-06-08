/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

var Barline = require("../primitives/barline.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");

class BarlineBridge extends Bridge {
    prereqs() {
        return [
            [
                (obj, cursor, stave, idx) => {
                    for (var i = idx - 1; i >= 0 && !stave.body[i].newline; --i) {
                        if (stave.body[i].pitch || stave.body[i].chord) {
                            return true;
                        }
                    }
                    return false;
                },
                (obj, cursor, stave, idx) => {
                    stave.body.splice(idx, 1);
                    return -1;
                },
                "At least one note must exist before a barline on every line"
            ],

            [
                (obj, cursor, stave, idx) => {
                    for (var i = idx - 1; i >= 0 && !stave.body[i].barline; ++i) {
                        if (stave.body[i].pitch || stave.body[i].chord || stave.body[i].newline) {
                            return true;
                        }
                    }
                    return false;
                },
                (obj, cursor, stave, idx) => {
                    stave.body.splice(idx, 1);
                    return -1;
                },
                "At least one note must exist between barlines"
            ],

            [
                () => false,
                (obj, cursor, stave, idx) => {
                    obj._offset = 0;
                    obj._newlineNext = (stave.body.length > idx + 1) && stave.body[idx + 1].newline;
                    return true;
                },
                "The barline offset and newline attributes should always be recalculated"
            ],

            [
                (obj, cursor) => obj._newlineNext || !cursor.lines[cursor.line - 1] ||
                    !_(cursor.lines[cursor.line - 1].barlineX).any(x => Math.abs(x - cursor.x) < 0.2),
                (obj, cursor, stave, idx) => {
                    // With this extra space, shift over notes/rests in the bar
                    var count = 0;
                    for (var i = idx - 1; i >= 0 &&
                            !stave.body[i].barline &&
                            !stave.body[i].newline; --i) {
                        if (stave.body[i].chord || stave.body[i].pitch) {
                            ++count;
                        }
                    }

                    var extraSpaceLeft = 0.5;
                    obj._offset = extraSpaceLeft;
                    var extraSpaceUnit = extraSpaceLeft / count;
                    for (var i = idx - 1; i >= 0 &&
                            !stave.body[i].barline &&
                            !stave.body[i].newline; --i) {
                        if (stave.body[i].chord || stave.body[i].pitch) {
                            stave.body[i]["$PitchBridge_annotatedExtraWidth"] += extraSpaceUnit;
                            extraSpaceLeft -= extraSpaceUnit;
                            this.setX(stave.body[i], this.x(stave.body[i]) + extraSpaceLeft);
                        }
                    }
                    return true;
                },
                "Barlines in adjacent staffs should not be aligned"
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        cursor.barlineX.push(cursor.x);

        cursor.x += (obj._newlineNext ? 0 : 0.5) + obj._offset;
        cursor.beats = 0;
        ++cursor.bar;
        cursor.renderKey_eInBar = {};
        cursor.accidentals = KeySignatureBridge.getAccidentals(cursor.keySignature);
        return true;
    }
    render(obj) {
        return <Barline
            stroke={obj.temporary ? "#A5A5A5" : (obj.selected ? "#75A1D0" : "black")}
            key={this.key(obj)}
            x={this.x(obj) + obj._offset}
            y={this.y(obj)} />;
    }
    toLylite(obj, lylite) {
        lylite.push("|");
    }
}

var createBarline = (obj, cursor, stave, idx) => {
    if (stave.body[idx].beam) {
        stave.body.splice(idx, 1);
        for (var j = idx; j < stave.body.length && stave.body[j].inBeam; ++j) {
            delete stave.body[j].inBeam;
            if (stave.body[j] === obj) {
                stave.body.splice(j, 0, {barline: true});
                ++j;
            }
        }
        return "line";
    }
    stave.body.splice(idx, 0, {barline: true});
    return -1;
};

module.exports = BarlineBridge;
module.exports.createBarline = createBarline;
