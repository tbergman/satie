/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

import Model = require("./model");

import Contracts = require("./contracts");
import Context = require("./context");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");

class BeginModel extends Model {
    pianoStaff: boolean;
    stave: Contracts.Stave;
    noMargin : boolean;
    braceY : number;
    getBraceY2: () => number;
    pageSize: Contracts.PageSize;

    annotateImpl(ctx: Context): IterationStatus {
        this.pianoStaff = ctx.stave.pianoStaff;
        this.stave = ctx.stave;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin = true;
        } else {
            this.noMargin = false;
        }
        this.braceY = this.y();
        // We're cheating here! y() won't be annotated yet, but it will
        // be at render time!.
        this.getBraceY2 = () => ctx.nextStave().body[0].y();
        this.pageSize = ctx.pageSize;
        return IterationStatus.SUCCESS;
    }
    toLylite() {
    }
    visible() {
        return true;
    }

    static createBegin = (ctx: Context) => {
        return ctx.insertPast(new BeginModel(
            {_annotated: "createBegin"}));
    };

    prereqs = BeginModel.prereqs;
    static prereqs: Array<SmartCondition> = [
        {
            condition: function(ctx) {
                return ctx.idx === 0;
            },
            correction: function(ctx) {
                return ctx.eraseCurrent();
            },
            description: "BeginModel must only appear at the begining of a song."
        }
    ];

    get type() {
        return Contracts.ModelType.BEGIN;
    }
}

Model.length; // BUG in typescriptifier

export = BeginModel;
