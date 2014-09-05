/**
 * @file Model for key signatures.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import Context = require("./context");
import ClefModel = require("./clef");

var isPitch = (k: C.IPitch, name: string, acc?: number) =>
    k.pitch === name && (k.acc || 0) === (acc || 0);

class KeySignatureModel extends Model {
    clef: string;
    keySignature: C.IKeySignature;
    _annotatedSpacing: number;
    color: string;
    temporary: boolean;
    selected: boolean;
    pitch: C.IPitch;

    annotateImpl(ctx: Context): C.IterationStatus {
        if (!ctx.clef) {
            return ClefModel.createClef(ctx);
        }

        // Copy information from the context that the view needs.
        this.clef = ctx.clef;
        var next = ctx.next();
        ctx.keySignature = this.keySignature;
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);
        if (next.isNote) {
            // if (_.any(_.filter(next.intersects, (l: Model) => l.isNote),
            //                n => n.containsAccidental(ctx)) ? 1 : 0) {
            //     // TODO: should be 1 if there are more than 1 accidental.
            //     this._annotatedSpacing = 2.5;
            // } else {
            this._annotatedSpacing = 1.5;
            // }
        } else {
            this._annotatedSpacing = 1;
        }
        var c: number = this.getSharpCount() || this.getFlatCount();
        if (c) {
            ctx.x += this._annotatedSpacing/4 + 0.26*c;
        }
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        if (this.source === C.Source.ANNOTATOR) {
            return;
        }

        var acc = "";
        if (this.keySignature.acc === -1) {
            acc = "es";
        } else if (this.keySignature.acc === 1) {
            acc = "is";
        }
        lylite.push("\\key " +
            this.keySignature.pitch.pitch + acc + " " + this.keySignature.mode + "\n");
    }
    getSharpCount() {
        return KeySignatureModel.getSharpCount(this.keySignature);
    }
    getFlatCount() {
        return KeySignatureModel.getFlatCount(this.keySignature);
    }
    static createKeySignature = (ctx: Context): C.IterationStatus => {
        return ctx.insertPast(new KeySignatureModel({
            keySignature: ctx.prevKeySignature ||
                {pitch: {pitch: "c"}, acc: 0, mode: C.MAJOR},
            source: C.Source.ANNOTATOR
        }));
    };

    static getSharpCount = (keySignature: C.IKeySignature): number => {
        var k = keySignature.pitch;
        if (keySignature.mode === C.MAJOR) {
            if (isPitch(k, "c")) {
                return 0;
            } else if (isPitch(k, "g")) {
                return 1;
            } else if (isPitch(k, "d")) {
                return 2;
            } else if (isPitch(k, "a")) {
                return 3;
            } else if (isPitch(k, "e")) {
                return 4;
            } else if (isPitch(k, "b")) {
                return 5;
            } else if (isPitch(k, "f", 1)) {
                return 6;
            } else if (isPitch(k, "c", 1)) {
                return 7;
            } else if (isPitch(k, "g", 1)) {
                return 7; // + fx
            }
        } else if (keySignature.mode === C.MINOR) {
            if (isPitch(k, "a")) {
                return 0;
            } else if (isPitch(k, "e")) {
                return 1;
            } else if (isPitch(k, "b")) {
                return 2;
            } else if (isPitch(k, "f", 1)) {
                return 3;
            } else if (isPitch(k, "c", 1)) {
                return 4;
            } else if (isPitch(k, "g", 1)) {
                return 5;
            } else if (isPitch(k, "d", 1)) {
                return 6;
            } else if (isPitch(k, "a", 1)) {
                return 7;
            } else if (isPitch(k, "e", 1)) {
                return 7; // + fx
            }
        } else {
            assert(0, "Not reached");
        }

        return undefined;
    };

    static getFlatCount = (keySignature: C.IKeySignature): number => {
        var k = keySignature.pitch;
        if (keySignature.mode === C.MAJOR) {
            if (isPitch(k, "f")) {
                return 1;
            } else if (isPitch(k, "b", -1)) {
                return 2;
            } else if (isPitch(k, "e", -1)) {
                return 3;
            } else if (isPitch(k, "a", -1)) {
                return 4;
            } else if (isPitch(k, "d", -1)) {
                return 5;
            } else if (isPitch(k, "g", -1)) {
                return 6;
            } else if (isPitch(k, "c", -1)) {
                return 7;
            } else if (isPitch(k, "f", -1)) {
                return 7; // + bbb
            }
        } else if (keySignature.mode === C.MINOR) {
            if (isPitch(k, "d")) {
                return 1;
            } else if (isPitch(k, "g")) {
                return 2;
            } else if (isPitch(k, "c")) {
                return 3;
            } else if (isPitch(k, "f")) {
                return 4;
            } else if (isPitch(k, "b", -1)) {
                return 5;
            } else if (isPitch(k, "e", -1)) {
                return 6;
            } else if (isPitch(k, "a", -1)) {
                return 7;
            } else if (isPitch(k, "d", -1)) {
                return 7; // + bbb
            }
        } else {
            assert(0, "Not reached");
        }

        return undefined;
    };

    static getAccidentals = (keySignature: C.IKeySignature) => {
        var ret: C.IAccidentals = {
            // This would increase speed:
//            "a": null,
//            "b": null,
//            "c": null,
//            "d": null,
//            "e": null,
//            "f": null,
//            "g": null
        };

        var flats = KeySignatureModel.getFlatCount(keySignature);
        if (flats) {
            _.times(flats, idx => {
                ret[KeySignatureModel.flatCircle[idx]] = -1;
            });
            return ret;
        }

        var sharps = KeySignatureModel.getSharpCount(keySignature);
        _.times(sharps, idx => {
            ret[KeySignatureModel.sharpCircle[idx]] = 1;
        });
        return ret;
    };
    static flatCircle = "beadgcf";
    static sharpCircle = "fcgdaeb";

    get type() {
        return C.Type.KEY_SIGNATURE;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = KeySignatureModel;
