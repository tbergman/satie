/**
 * @file Renders annotations like staccato, or accents.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

import C = require("../stores/contracts");
import Glyph = require("./_glyph");
import getFontOffset = require("./_getFontOffset");

class NoteNotation extends TypedReact.Component<NoteNotation.IProps, {}> {
    render() {
        var offset  = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var start   = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var o2      = C.SMuFL.bravuraBBoxes[this.glyphName()][3];
        var s2      = C.SMuFL.bravuraBBoxes[this.glyphName()][0];
        return <!Glyph.Component
            x               = {this.props.x + this.xOffset() + (offset - start)/4/2 + (o2 - s2)/4/2}
            y       		= {this.props.y - this.yOffset()}
            fill    		= {this.glyphIsTemporary() ? "#A5A5A5" : "#000000"}
            glyphName   	= {this.glyphName()}
            glyphIsTemporary= {this.glyphIsTemporary()} />;
    }

    directionString() {
        if (C.SMuFL.bravuraBBoxes[this.notationName()]) {
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
            if (this.notationName().indexOf(above[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    shouldBeBelowStaff() {
        var below = ["dynamic"];
        for (var i = 0; i < below.length; ++i) {
            if (this.notationName().indexOf(below[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    glyphIsTemporary() {
        return false; // MXFIX
        // return this.props.notation.substr(0, 2) === "__";
    }
    glyphName() {
        return this.notationName() + this.directionString();
    }
    notationName() {
        return ""; // MXFIX
        // var isTmp = this.glyphIsTemporary();
        // return isTmp ? this.props.notation.substring(2) : this.props.notation;
    }
    direction() {
        if (this.shouldBeAboveStaff()) {
            return -1;
        }
        return this.props.direction;
    }
    private getFontOffset = getFontOffset;
    xOffset() {
        // MXFIX
        // if (this.props.notation.indexOf("caesura") === 0) {
        //     return -3/8; // TODO -- move to DurationModel and fix
        // } else if (this.props.notation.indexOf("breathMarkComma") === 0) {
        //     return 3/8; // TODO -- move to DurationModel and fix
        // }
        return 0;
    }
    yOffset() {
		var m: number;
        if (this.shouldBeAboveStaff()) {
			m = (6.0 + this.props.idx - 3)/4;
			if (m + 1.5 <= this.props.line/4) {
				m = (this.props.line)/4 + 1.5;
			}
			return m;
        } else if (this.shouldBeBelowStaff()) {
            m = (-1.5 + this.props.idx - 3)/4;
            if (m + 1.5 >= this.props.line/4) {
                m = (this.props.line)/4 - 1.5;
            }
            return m;
        }

        if (this.direction() === 1) {
            return (this.props.line - 1.2 - (this.props.line % 1 && this.props.line - 1.2 > 0 ? 0.4 : 0) - this.props.idx - 3)/4;
			//                               ^^^^^ Prevents notations from begin on lines
        }

        return (this.props.line + 1.2 + (this.props.line % 1  && this.props.line + 1.2 < 5 ? 0.4 : 0) + this.props.idx - 3)/4;
		//                               ^^^^^ Prevents notations from begin on lines
    }
}

module NoteNotation {
    "use strict";
    export var Component = TypedReact.createClass(NoteNotation, [PureRenderMixin]);

    export interface IProps {
        direction: number; // -1 or 1
        idx: number;
        line: number;
        notation: C.MusicXML.Notations;
        notehead: string;
        x: number;
        y: number;
    }
}

export = NoteNotation;
