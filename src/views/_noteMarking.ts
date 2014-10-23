/**
 * Renders annotations like staccato, or accents.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("../typedReact");

import Glyph = require("./_glyph");
import SMuFL = require("../util/SMuFL");
import getFontOffset = require("./_getFontOffset");

class NoteMarking extends TypedReact.Component<NoteMarking.IProps, {}> {
    render() {
        var offset = SMuFL.bravuraBBoxes[this.props.notehead].bBoxNE;
        var start = SMuFL.bravuraBBoxes[this.props.notehead].bBoxSW;
        var o2 = SMuFL.bravuraBBoxes[this.glyphName()].bBoxSW;
        var s2 = SMuFL.bravuraBBoxes[this.glyphName()].bBoxNE;
        return Glyph.Component({
            x: this.props.x + this.xOffset() + (offset[0] - start[0])/4/2 + (o2[0] - s2[0])/4/2,
            y: this.props.y - this.yOffset(),
            fontSize: this.props.fontSize,
            fill: "#000000",
            staveHeight: this.props.fontSize,
            glyphName: this.glyphName()});
    }

    directionString() {
        if (SMuFL.bravuraBBoxes[this.props.marking]) {
            return "";
        } else if (this.direction() === 1) {
            return "Below";
        } else if (this.direction() === -1) {
            return "Above";
        }
    }
    shouldBeAboveStaff() {
        var above = ["fermata", "breathMark", "caesura", "strings"];
        for (var i = 0; i < above.length; ++i) {
            if (this.props.marking.indexOf(above[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    shouldBeBelowStaff() {
        var below = ["dynamic"];
        for (var i = 0; i < below.length; ++i) {
            if (this.props.marking.indexOf(below[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    glyphName() {
        return this.props.marking + this.directionString;
    }
    direction() {
        if (this.shouldBeAboveStaff) {
            return -1;
        }
        return this.props.direction;
    }
    getFontOffset = getFontOffset;
    xOffset() {
        if (this.props.marking.indexOf("caesura") === 0) {
            return -3/8; // TODO -- move to DurationModel and fix
        } else if (this.props.marking.indexOf("breathMarkComma") === 0) {
            return 3/8; // TODO -- move to DurationModel and fix
        }
        return 0;
    }
    yOffset() {
		var m: number;
        if (this.shouldBeAboveStaff) {
			m = (6.0 + this.props.idx - 3)/4;
			if (m + 1.5 <= this.props.line/4) {
				m = (this.props.line)/4 + 1.5;
			}
			return m;
        } else if (this.shouldBeBelowStaff) {
            m = (-1.5 + this.props.idx - 3)/4;
            if (m + 1.5 >= this.props.line/4) {
                m = (this.props.line)/4 - 1.5;
            }
            return m;
        }

        if (this.direction() === 1) {
            return (this.props.line - 1.2 - (this.props.line % 1 && this.props.line - 1.2 > 0 ? 0.4 : 0) - this.props.idx - 3)/4;
			//                               ^^^^^ Prevents markings from begin on lines
        }

        return (this.props.line + 1.2 + (this.props.line % 1  && this.props.line + 1.2 < 5 ? 0.4 : 0) + this.props.idx - 3)/4;
		//                               ^^^^^ Prevents markings from begin on lines
    }
}

module NoteMarking {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, NoteMarking);

    export interface IProps {
        direction: number; // -1 or 1
        fontSize: number;
        idx: number;
        line: number;
        marking: string;
        notehead: string;
        x: number;
        y: number;
    }
}

export = NoteMarking;