/**
 * @jsx React.DOM
 */

import Model = require("./model");

import _ = require("lodash");
import assert = require("assert");

import Context = require("./context");
import Contracts = require("./contracts");
import ClefModel = require("./clef");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");

var isPitch = (k: Contracts.Pitch, name: string, acc?: number) =>
    k.pitch === name && (k.acc || 0) === (acc || 0);

class KeySignatureModel extends Model {
    clef: string;
    keySignature: Contracts.KeySignature;
    _annotatedSpacing: number;
    color: string;
    temporary: boolean;
    selected: boolean;
    pitch: Contracts.Pitch;

    annotateImpl(ctx: Context): IterationStatus {
        this.clef = ctx.clef;
        var next = ctx.next();
        ctx.keySignature = this.keySignature;
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);
        if (next.isNote) {
            if (_.any(_.filter(next.intersects, (l: Model) => l.isNote),
                           n => n.containsAccidental(ctx)) ? 1 : 0) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 2.5;
            } else {
                this._annotatedSpacing = 1.5;
            }
        } else {
            this._annotatedSpacing = 1;
        }
        var c: number = this.getSharpCount() || this.getFlatCount();
        if (c) {
            ctx.x += this._annotatedSpacing/4 + 0.26*c;
        }
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        if (this["_annotated"]) {
            return;
        }

        var acc = "";
        if (this.keySignature.acc === -1) {
            acc = "es";
        } else if (this.keySignature.acc === 1) {
            acc = "is";
        }
        lylite.push("\\key " +
            this.keySignature.pitch.pitch + acc + " " + this.keySignature.mode);
    }
    getSharpCount() {
        return KeySignatureModel.getSharpCount(this.keySignature);
    }
    getFlatCount() {
        return KeySignatureModel.getFlatCount(this.keySignature);
    }
    static createKeySignature = (ctx: Context): IterationStatus => {
        return ctx.insertPast(new KeySignatureModel({
            keySignature: ctx.prevKeySignature ||
                {pitch: {pitch: "c"}, acc: 0, mode: Contracts.MAJOR},
            _annotated: "createKeySignature"
        }));
    };

    static getSharpCount = (keySignature: Contracts.KeySignature): number => {
        var k = keySignature.pitch;
        if (keySignature.mode === Contracts.MAJOR) {
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
        } else if (keySignature.mode === Contracts.MINOR) {
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

    static getFlatCount = (keySignature: Contracts.KeySignature): number => {
        var k = keySignature.pitch;
        if (keySignature.mode === Contracts.MAJOR) {
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
        } else if (keySignature.mode === Contracts.MINOR) {
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

    static getAccidentals = (keySignature: Contracts.KeySignature) => {
        var ret: Contracts.Accidentals = {};

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

    prereqs = KeySignatureModel.prereqs;
    static prereqs: Array<SmartCondition> = [
        {
            condition: function (ctx: Context): boolean {
                return !!ctx.clef;
            },
            correction: ClefModel.createClef,
            description: "A clef must exist on each line."
        }
    ];

    get type() {
        return Contracts.ModelType.KEY_SIGNATURE;
    }
}

Model.length; // BUG in typescriptifier

export = KeySignatureModel;
