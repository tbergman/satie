/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

import _                        = require("lodash");
import assert               	= require("assert");

import AttributesModel      	= require("./attributes");
import BarlineModel         	= require("./barline");
import C                    	= require("./contracts");
import Model                	= require("./model");
import NewlineModelType     	= require("./newline");         // Cyclic.
import PlaceholderModelType 	= require("./placeholder"); 	// Cyclic.

/**
 * Annotator has two goals:
 * 
 *  1) Put a set of parts into a state where they can be rendered. For example, Annotator would
 *     set the position of all items, insert barlines/rests, and add the appropriate accidentals.
 *     When a song is loaded from source (e.g., MusicXML, lilypond), it cannot out of the box be
 *     displayed. Calling (new Annotator(parts)).annotate() is all that is necessary to make it
 *     renderable.
 * 
 *  2) Wrap all mutations to the parts. For example, the NoteTool will use an annotator to add
 *     a note, or change a rest into a note. In this case, Annotator.annotate should be called
 *     with all parameters. It is worth noting that Annotator does NOT specify what the change is.
 *     Instead, it just ensures that all the appropriate changes are made to the parts so that
 *     after the change is made, the parts are in a valid and renderable state.
 */
export class Context implements C.MetreContext {
    constructor(parts: Array<C.IPart>, layout: ILayoutOpts, editor: C.ISongEditor, assertionPolicy: AssertionPolicy) {
        this._parts             = parts;
        this._layout            = layout;
        this._assertionPolicy   = assertionPolicy;
        this.songEditor         = editor;

        if (layout) {
            if (layout.snapshot) {
                _cpysnapshot(this, layout.snapshot);
            } else {
                this.lines      = [this.captureLine()];
            }
        }
    }

    /**
     * After the function exits, any part of the Annotator's parts after 'from' can be rendered.
     * The default value of 'from' is the beginning of the song.
     * 
     * If 'mutation' is set, then the parts will be modified according to what is specified in
     * 'mutation'. The mutation must be after 'from'. All modifications to parts must go through
     * Annotator.annotate.
     */
    annotate(from: C.ILocation, mutation: ICustomAction,
            cursor: C.IVisualCursor, disableRecording: boolean, dispatcher: C.IDispatcher): C.IAnnotationResult {
        assert(!Context._ANNOTATING, "annotate() may not be called recursively.");
        Context._ANNOTATING                 = true;
        var error: Error                    = null;
        var result: C.IAnnotationResult;
        assert(from.bar !== 0);
        assert(this._parts, "Staves must be set!");

        try {
            result                          = this._annotateImpl(from, mutation, cursor, disableRecording);
        } catch (err) {
            // Catch the error so we can set _ANNOTATING to false and thus allow future annotations.
            error = err;
        }

        Context._ANNOTATING                 = false;

        if (error) {
            // Clear any render flags to avoid rendering the current (broken) state
            this.songEditor.dangerouslyMarkRenderDone();
            _.defer(() => {
                dispatcher.PUT("/webapp/song/undo");     // Un-break the state.
            });
            throw error;
        }
        return result;
    }

    /**
     * Only properties that change per line or within a line are saved to by captureLine
     * 
     * To restore an Annotator back to a state saved to by JSON.stringify(ctx.captureLine()), see _cpyline.
     */
    captureLine(): ILineSnapshot {
        return {
            accidentalsByStave:     C.JSONx.clone(this.accidentalsByStave),
            bar:                    this.loc.bar,
            barKeys:                this.barKeys,
            barlineX:               this.barlineX,
            beat:                   this.loc.beat,
            attributes:             this.attributes,
            line:                   this.line,
            pageLines:              this.pageLines,
            pageStarts:             this.pageStarts,
            partIdx:                this.currStaveIdx,
            x:                      this.x,
            y:                      this.y
        };
    }

    captureSnapshot(): IPartialSnapshot {
        return {
            fontSize:               this.fontSize,
            maxX:                   this.maxX,
            maxY:                   this.maxY,
            prevLine:               this.lines[this.line - 1],
            partialLine:            this.lines[this.line],
            attributes:             this.attributes
        };
    }



    /**
     * The element currently being annotated.
     */
    get curr(): Model {
        return this.body[this.idx];
    }

    get staveSpacing(): number {
        var print                   = C.getPrint(this._layout.header);
        var staffLayout             = print.staffLayouts[this.currStaveIdx];
        var staffSpacing            = staffLayout ? staffLayout.staffDistance : null;

        switch(true) {
            case !isNaN(staffSpacing):
                return staffSpacing;
            case !isNaN(print.staffSpacing):
                return print.staffSpacing;
            default:
                return 0;
        }
    }

    /**
     * 1-indexed to match MusicXML!
     */
    get page(): number {
        for (var i = 0; i < this.pageStarts.length; ++i) {
            if (this.pageStarts[i] < this.line) {
                return i;
            }
        }
        return this.pageStarts.length;
    }

    /**
     * Returns the next element in the current part, subject to certain options.
     * By default, this function skips over beams.
     * 
     * @param condition: Function that returns false if model should be skipped.
     * @param skip: Start looking at Models <skip> after current. 1 if unspecified.
     * @param allowModifiers: True if beams and other modifiers should be eligible. False by default.
     */
    next(condition?: (model: Model) => boolean, skip?: number, allowModifiers?: boolean) {
        // Don't ask me why, but doing this.body[nextIdx...] is 10x slower in Chrome 39!
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && (
                (this.body[this.idx + i].isModifier && !allowModifiers) ||
                (condition && !condition(this.body[this.idx + i])))) {
            ++i;
        }
        return this.body[this.idx + i];
    }

    /**
     * Returns the index of the next element in the current part, subject to certain options.
     * By default, this function skips over beams.
     * 
     * @param condition: Function that returns false if model should be skipped.
     * @param skip: Start looking at Models <skip> after current. 1 if unspecified.
     * @param allowModifiers: True if beams and other modifiers should be eligible. False by default.
     */
    nextIdx(cond?: (model: Model, idx?: number) => boolean, skip?: number, allowModifiers?: boolean) {
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && (
                (this.body[this.idx + i].isModifier && !allowModifiers) ||
                (cond && !cond(this.body[this.idx + i], this.idx + i)))) {
            ++i;
        }
        return this.idx + i;
    }

    /**
     * Search all parts for elements of type 'type' on the same beat
     * 
     * @param idx?: Index to search from.
     */
    intersects(type: C.Type, idx: number = this.idx) {
        var intersects: Array<Model> = [];
        for (var i = 0; i < this._parts.length; ++i) {
            var body = this._parts[i].body;
            if (!body) { continue; }
            // Before
            for (var j = idx - 1; j >= 0; --j) {
                if (body[j].type === type) { intersects.push(body[j]); }
                if (body[j].priority === C.Type.Duration) { break; }
            }
            // Current
            if (body[idx].type === type) { intersects.push(body[idx]); }
            // After
            for (var j = idx + 1; j < body.length; ++j) {
                if (body[j].type === type) { intersects.push(body[j]); }
                if (body[j].priority === C.Type.Duration) { break; }
            }
        }
        return intersects;
    }

    /**
     * Returns a BeamGroup, if one follows. Otherwise, returns null.
     */
    beamFollows(idx?: number): Array<{ inBeam: boolean; tuplet: C.ITuplet; }> {
        // Must return .beam
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        var inBeam = this.body[idx + 1].priority === C.Type.BeamGroup;
        if (inBeam) {
            var beamed: Array<{ inBeam: boolean; tuplet: C.ITuplet; }> = [];
            for (var i = 0; i < this._parts.length; ++i) {
                if (this._parts[i].body &&
                    this._parts[i].body[idx + 1].type === C.Type.BeamGroup) {
                    var newBeam: Array<{ note: C.IPitchDuration }> = (<any>this._parts[i].body[idx + 1]).beam;
                    beamed = beamed.concat(<any>newBeam);
                }
            }
            return beamed;
        } else {
            return null;
        }
    }

    removeFollowingBeam(idx?: number, past?: boolean): C.IterationStatus {
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }

        assert(past || idx >= this.idx, "Set past to true if you are " +
                "removing an already-processed beam (this is inefficient)");
        var beam = this.beamFollows(idx);
        assert(beam, "There must be a beam to remove");
        beam.forEach(p => { p.inBeam = false; });
        return (past ? this.erasePast : this.eraseFuture).call(this, idx + 1);
    }

    /**
     * If a condition is given, searches backwards starting at the previous
     * item. Otherwise, returns the item directly before the current item.
     */
    prev(condition?: (m: Model) => boolean, offset?: number) {
        if (!condition) {
            return this.body[this.idx - 1];
        } else {
            for (var i = this.idx - (isNaN(offset) ? 1 : offset); i >= 0; --i) {
                if (condition(this.body[i])) {
                    return this.body[i];
                }
            }
            return null;
        }
    }

    /**
     * Removes the current item.
     * @mutator
     */
    eraseCurrent(splicePolicy = SplicePolicy.Masked): C.IterationStatus {
        this.splice(this.idx, 1, null, splicePolicy);
        return C.IterationStatus.RetryCurrent;
    }

    /**
     * Removes an item that is after the current item. This is efficient.
     * @mutator
     */
    eraseFuture(idx: number): C.IterationStatus {
        assert(idx > this.idx, "Invalid use of eraseFuture");

        this.splice(idx, 1, null);
        return C.IterationStatus.Success;
    }

    /**
     * Removes an item that is before the current item. This is inefficient.
     * @mutator
     */
    erasePast(idx: number): C.IterationStatus {
        assert(idx <= this.idx, "Invalid use of erasePast");

        this.splice(idx, 1);
        return C.IterationStatus.RetryFromEntry;
    }

    /**
     * Inserts an element somewhere after the current element. This is efficient.
     * @mutator
     * 
     * @param index: The absolute position to insert an element at.
     *     By default, one after current position.
     */
    insertFuture(obj: Model, index?: number): C.IterationStatus {
        index = (index === null || index === undefined) ? (this.idx + 1) : index;
        assert(index > this.idx, "Otherwise, use 'insertPast'");
        this.splice(index, 0, [obj], obj.isNote ? SplicePolicy.Masked : SplicePolicy.Additive);

        return C.IterationStatus.Success;
    }

    /**
     * Inserts an element somewhere before the current element. This is inefficient.
     * @mutator
     * 
     * @param index The absolute position to insert an element at.
     *     By default, just before current position.
     */
    insertPast(obj: Model, index?: number, merge?: boolean): C.IterationStatus {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");

        var exitCode = this.idx === index ? C.IterationStatus.RetryCurrent :
            C.IterationStatus.RetryFromEntry;

        this.splice(index, 0, [obj], SplicePolicy.Additive);

        return exitCode;
    }

    /**
     * @mutator vertical
     */
    insertPastVertical(objs: Array<Model>, index?: number): C.IterationStatus {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");

        var exitCode = this.idx === index ? C.IterationStatus.RetryCurrent :
            C.IterationStatus.RetryFromEntry;

        var visibleIdx = -1;
        for (var i = 0; i < this._parts.length; ++i) {
            var part = this._parts[i];
            if (part.body) {
                ++visibleIdx;
                part.body.splice(index, 0, objs[visibleIdx]);
            }
        }

        return exitCode;
    }

    /**
     * Simplified form of Array.splice for body.
     * The sledgehammer of the mutator tools. Use sparingly.
     * @mutator
     */
    splice(start: number, count: number, replaceWith?: Array<Model>, splicePolicy: SplicePolicy = SplicePolicy.MatchedOnly) {
        var PlaceholderModel: typeof PlaceholderModelType = require("./placeholder");
        assert(!isNaN(start));
        assert(!isNaN(count));
        if (splicePolicy === SplicePolicy.Additive) {
            assert(!count, "You cannot remove anything in Additive mode");
        }
        replaceWith = replaceWith || [];
        this._assertAligned();

        if (splicePolicy === SplicePolicy.Masked) {
            var end = start + count - replaceWith.length;
            for (var i = end - 1; i >= start; --i) {
                var vertical = this.findVertical(m => !m.placeholder, i);
                if (vertical.length > 1 || vertical.length === 1 && vertical[0] !== this.body[i]) {
                    replaceWith = [<Model> new PlaceholderModel({
                        priority: vertical[0].priority
                    }, vertical[0].annotated)].concat(replaceWith);
                }
            }
        }

        if (this.body[start]) {
            var ctxStartData = this.body[start].ctxData;
            var startPriority = this.body[start].priority;
        } else {
            assert(this._assertionPolicy === AssertionPolicy.NoAssertions);
        }

        for (var i = 0; i < this._parts.length; ++i) {
            var part = this._parts[i];
            if (part.body) {
                if (this.body === part.body) {
                    if (replaceWith) {
                        Array.prototype.splice.apply(part.body,
                            [start, count].concat(<any>replaceWith));
                    } else {
                        part.body.splice(start, count);
                    }
                } else {
                    var placeholders: Array<Model> = [];
                    var vidx = start;
                    var fidx = start + count;
                    var ffidx = start + replaceWith.length;
                    var offset = 0;
                    for (var j = 0; j < replaceWith.length; ++j) {
                        if (splicePolicy !== SplicePolicy.Subtractive &&
                                vidx + j < Math.max(ffidx, fidx) &&
                                part.body[vidx + j] &&
                                part.body[vidx + j].priority === replaceWith[j].priority) {
                            if (vidx + j >= fidx) {
                                placeholders.push(new PlaceholderModel({
                                    priority: replaceWith[j].priority
                                }, replaceWith[j].annotated));
                            } else {
                                placeholders.push(part.body[vidx + j]);
                                if (splicePolicy === SplicePolicy.ShortenOtherParts) {
                                    var retained = placeholders[placeholders.length - 1];
                                    var fromMainPart = replaceWith[j];
                                    if (retained.calcBeats(this) > fromMainPart.calcBeats(this)) {
                                        assert(retained.isNote, "Only notes have durations");
                                        assert(replaceWith[j].isNote, "The retained and replaced notes should have the same priority");
                                        retained.note.count = fromMainPart.note.count;
                                        retained.note.dots = fromMainPart.note.dots;
                                        retained.note.tuplet = fromMainPart.note.tuplet;
                                    }
                                }
                            }
                        } else {
                            placeholders.push(new PlaceholderModel({
                                priority: replaceWith[j].priority
                            }, replaceWith[j].annotated));
                        }
                    }
                    if (replaceWith && replaceWith.length && count === 0 && ctxStartData) {
                        while (startPriority > C.Type.Barline &&
                            replaceWith[0].priority > C.Type.Barline &&
                            part.body[start + offset] && part.body[start + offset].ctxData &&
                            part.body[start + offset].priority > C.Type.Barline &&
                            new C.Location(part.body[start + offset].ctxData).lt(ctxStartData)) {
                            ++offset;
                        }
                    }

                    Array.prototype.splice.apply(part.body, [start + offset, count]
                        .concat(<any>placeholders));
                }
            }
        }
        this._assertAligned();
        if (splicePolicy === SplicePolicy.Masked) {
            var clot = start - 1;
            while(this.body[clot + 1] && this.body[clot + 1].priority > C.Type.Barline) {
                ++clot;
            }
            if (clot >= start) {
                while (this.body[start - 1] && this.body[start - 1].priority > C.Type.Barline) {
                    --start;
                }
            }
            this._realign(start, clot);
            this._assertAligned();
        }
    }

    /**
     * @mutator
     */
    removeAdjacentBeams(note?: C.IDuration): C.IterationStatus {
        var obj = this.curr;
        if (obj.inBeam) {
            var i = this.idx;
            while (i >= 0 && this.body[i].type !== C.Type.BeamGroup) {
                --i;
            }
            var tuplet: C.ITuplet = (<any>this.body[i]).tuplet; // TS
            if (tuplet && note) {
                note.tuplet = C.JSONx.clone(tuplet);
            }
            this.removeFollowingBeam(i - 1, true);
            --this.idx;
            return C.IterationStatus.RetryLine;
        } else if (this.beamFollows()) {
            this.removeFollowingBeam();
            return C.IterationStatus.RetryCurrent;
        }
        return C.IterationStatus.Success;
    }

    /**
     * @mutator
     */
    removeRemainingBeamsInBar(): C.IterationStatus {
        for (var i = this.idx + 1; this.body[i].priority !== C.Type.EndMarker; ++i) {
            if (this.body[i].priority === C.Type.BeamGroup) {
                this.removeFollowingBeam(i - 1);
                --i;
            }
        }
        return C.IterationStatus.Success;
    }

    static insertPlaceholders(parts: Array<C.IPart>) {
        var PlaceholderModel: typeof PlaceholderModelType = require("./placeholder");
        function length() {
            var l = 0;
            for (var i = 0; i < parts.length; ++i) {
                if (parts[i].body) {
                    l = Math.max(parts[i].body.length, l);
                }
            }
            return l;
        }

        for (var i = 0; i < length(); ++i) {
            var bestPri = C.Type.Unknown;
            for (var j = 0; j < parts.length; ++j) {
                if (parts[j].body && parts[j].body[i]) {
                    bestPri = Math.min(parts[j].body[i].priority, bestPri);
                }
            }
            for (var j = 0; j < parts.length; ++j) {
                if (parts[j].body && (!parts[j].body[i] || parts[j].body[i].priority !== bestPri)) {
                    parts[j].body.splice(i, 0, new PlaceholderModel({ priority: bestPri }, true));
                }
            }
        }
    }

    private _realign(start: number, end: number) {
        var PlaceholderModel: typeof PlaceholderModelType = require("./placeholder");
        var bodies = this._parts.filter(s => !!s.body).map(s => s.body);
        var cBeats = bodies.map(b => 0);
        var placeholders = bodies.map(b => <Array<Model>>[]);
        var reals = bodies.map(b => <Array<Model>>[]);
        var aligned = bodies.map(b => <Array<Model>>[]);

        for (var i = start; i <= end; ++i) {
            for (var j = 0; j < bodies.length; ++j) {
                if (this._assertionPolicy !== AssertionPolicy.Strict && !bodies[j][i]) {
                    break;
                }
                var valid = bodies[j][i].priority > C.Type.Barline;
                if (this._assertionPolicy === AssertionPolicy.Strict) {
                    assert(valid, "Realign only takes durations and modifiers.");
                }

                if (bodies[j][i].placeholder) {
                    placeholders[j].push(bodies[j][i]);
                } else {
                    reals[j].push(bodies[j][i]);
                }
            }
        }

        while(_.any(reals, r => r.length)) {
            var thisBeat = _.min(reals.map((r, j) => r.length ? cBeats[j] : 100000));
            var thisPriority = _.min(reals.map((r, j) => r.length && cBeats[j] === thisBeat ? r[0].priority : 100000));
            for (var j = 0; j < bodies.length; ++j) {
                if (reals[j].length && (cBeats[j] === thisBeat) && reals[j][0].priority === thisPriority) {
                    if (reals[j][0].isNote) {
                        // Beams have beats, but that's because it's usually processed instead of the notes beats.
                        cBeats[j] += reals[j][0].calcBeats(this);
                    }
                    aligned[j] = aligned[j].concat(reals[j].splice(0, 1));
                } else {
                    if (!placeholders[j][0] || placeholders[j][0].priority !== thisPriority) {
                        console.warn("Sketchily adding a new placeholder to fix alignment (be worried)");
                        aligned[j] = aligned[j].concat(new PlaceholderModel({ priority: thisPriority }, true));
                    } else {
                        aligned[j] = aligned[j].concat(placeholders[j].splice(0, 1));
                    }
                }
            }
        }

        var firstSize = aligned[0].length;
        var j = 0;
        for (var k = 0; k < this._parts.length; ++k) {
            if (!this._parts[k].body) {
                continue;
            }
            if (this._assertionPolicy !== AssertionPolicy.NoAssertions) {
                assert.equal(firstSize, aligned[j].length);
            }
            Array.prototype.splice.apply(this._parts[k].body, [start, end + 1 - start].concat(<any>aligned[j]));

            ++j;
        }

        recordMetreData(this._parts);
    }

    findVertical(where?: (obj: Model) => boolean, idx?: number) {
        if (isNaN(idx)) {
            idx = this.idx;
        }
        return _.chain(this._parts)
            .filter(s => !!s.body)
            .map(s => s.body[idx])
            .filter(s => s && (!where || !!where(s)))
            .value();
    }

    midiOutHint(out: number[]) {
        this.songEditor.midiOutHint(out);
    }

    get nextActualType(): number {
        var i = this.idx + 1;
        while (i < this.body.length && this.body[i].type === C.Type.Placeholder) {
            ++i;
        }
        return this.body[i] ? this.body[i].type : null;
    }

    _barAfter(index: number): Model {
        for (var i = index; i < this.body.length; ++i) {
            if (this.body[i].type === C.Type.Barline) {
                return this.body[i];
            }
        }
    }

    get ts(): C.ISimpleTimeSignature {
        return this.attributes.time ? {
            beats: this.attributes.time.beats[0],
            beatType: this.attributes.time.beatTypes[0],
            commonRepresentation: this.attributes.time.symbol !== C.MusicXML.TimeSymbolType.Normal
        } : null;
    }

    set ts(ts: C.ISimpleTimeSignature) {
        this.attributes.time = this.attributes.time || <any>{};
        this.attributes.time.beats = [ts.beats];
        this.attributes.time.beatTypes = [ts.beatType];
        switch(true) {
            case ts.commonRepresentation && ts.beats === 4 && ts.beatType === 4:
                this.attributes.time.symbol = C.MusicXML.TimeSymbolType.Common;
                break;
            case ts.commonRepresentation && ts.beats === 2 && ts.beatType === 2:
                this.attributes.time.symbol = C.MusicXML.TimeSymbolType.Cut;
                break;
            default:
                console.warn("Unknown common TS");
                // Pass through
            case !ts.commonRepresentation:
                this.attributes.time.symbol = C.MusicXML.TimeSymbolType.Normal;
                break;
        }
    }


    /**
     * Makes C.IterationStatus.RETRY_FROM_ENTRY restart from the very beginning of the song.
     * 
     * Avoid if possible.
     */
    markEntireSongDirty(): void {
        this.nullEntry = true;
    }

    /**
     * @deprecated DO NOT USE
     * 
     * The body in the current part. Annotation is now interlaced, so if you're using body,
     * you're likely doing something dangerous.
     * @scope temporary
     */
    body: Model[];

    /**
     * @deprecated DO NOT USE
     * 
     * The index of body currently being annotated. Annotation is now interlaced, so if you're
     * using idx, you're likely doing something dangerous.
     * @scope temporary
     */
    idx: number;

    /**
     * The current part.
     * @scope temporary
     */
    currStave: C.IPart;

    /**
     * For marking part lines dirty, for example.
     * @scope temporary
     */
    currStaveIdx: number;

    /**
     * Set at the beginning of every beam. Called so that if the annotator has
     * to be "backed up", it can do so without recalculating from the beginning
     * of the line.
     */
    startOfBeamBeat: number = NaN;

    /**
     * @deprecated DO NOT USE
     * 
     * Use loc.beat
     */
    get beat() {
        return this.loc.beat;
    }

    set beat(b: number) {
        this.loc.beat = b;
    }

    /**
     * The lowest beat of all components.
     */
    __globalBeat__: number;

    /**
     * @deprecated DO NOT USE
     * 
     * Use loc.bar
     */
    get bar() {
        return this.loc.bar;
    }

    set bar(b: number) {
        this.loc.bar = b;
    }

    /**
     * @deprecated DO NOT USE
     */
    get endMarker() {
        return false;
    }



    /**
     * The default accidental for all notes. Reset to the key signature on each barline
     * @scope line
     */
    accidentalsByStave: Array<C.IAccidentals> = [];

    /**
     * The positions of all the barlines in the current line.
     * @scope line
     */
    barlineX: Array<number> = [];

    /**
     * The current line number.
     * @scope line
     */
    line: number = 0;

    /**
     * The current beat and bar
     * @scope line
     */
    loc: C.ILocation = {
        bar: 1,
        beat: 0
    };

    /**
     * The first line number of every page
     * @scope line
     */
    pageLines: Array<number> = [0];

    /**
     * The first index of every page
     * @scope line
     */
    pageStarts: Array<number> = [0];

    /**
     * The smallest raw count (duration) in a line.
     * @scope line
     */
    smallest: number = 10000;

    /**
     * The current position (x)
     * @scope line
     */
    x: number;

    /**
     * The current position of the top part (y)
     * @scope line
     */
    y: number;

    /**
     * The ordered keys of bars. Should be the same for all parts.
     * @scope line
     */
    barKeys: Array<string>;


    /**
     * The font size.
     * @scope layout
     */
    fontSize: number;

    /**
     * The end of a line.
     * @scope layout
     */
    maxX: number;

    /**
     * The end of a page
     * @scope layout
     * 
     */
    maxY: number;

    /**
     * The Flux store.
     */
    songEditor: C.ISongEditor;

    private static _ANNOTATING: boolean = false;
    disableRecordings: boolean = true;
    _recordings: { [key: string]: BarlineModel } = null;
    record(model: BarlineModel) {
        this._recordings[model.key] = model;
    }

    /**
     * This structure is unwieldy. Serialize Context for debugging only!
     */
    toJSON() : {} {
        var serializable: {[key: string]: any} = {};
        for (var key in this) {
            if (this.hasOwnProperty(key) && key !== "songEditor") {
                serializable[key] = (<any>this)[key];
            }
        }
        return serializable;
    }

    private _annotateImpl(from?: C.ILocation, mutation?: ICustomAction,
                cursor?: C.IVisualCursor, disableRecordings?: boolean):
            C.IAnnotationResult {
        from = from || { bar: 1, beat: 0 };

        this.disableRecordings = disableRecordings;
        if (!this.disableRecordings) {
            this._recordings = {};
        }
        var status: C.IterationStatus;
        var ops = 0;
        var initialLength = _.max(this._parts, s => s.body ? s.body.length : 0).body.length || 1;
        var verbose = false;
        var stopIn = NaN;

        for (var it = new PrivIterator(this, from, this._parts, mutation, cursor, this._assertionPolicy);
                !it.atEnd; it.next(status)) {
            if (++ops/initialLength >= 500 && isNaN(stopIn)) {
                verbose = true;
                stopIn = 20;
            }
            if (--stopIn === 0) {
                throw "because of timeout";
            }
            status = it.annotate(verbose);
        }

        if (it.eofJustificationDirty) {
            this._semiJustify(this._parts);
        }

        var patch = _.map(this._recordings, (model: BarlineModel) => {
            var p = model.createPatch(model.idx, this.body /* XXX: BROKEN FOR MULTISTAVE */);
            if (p) {
                p += "\n";
            }
            return p;
        }).filter(p => !!p);

        return {
            cursor: null,
            operations: 5,
            resetY: false,
            skip: status === C.IterationStatus.ExitEarly, // If skip is true, context is not updated.
            success: true,
            patch: patch
        };
    }

    private _semiJustify(parts: Array<C.IPart>) {
        var NewlineModel: typeof NewlineModelType = require("./newline");
        var bodies: Model[][] = [];
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                bodies.push(parts[i].body);
                this.idx = this.body.length - 1;
                this.body = parts[i].body;
                NewlineModel.semiJustify(this);
                this.idx = -1;
            }
        }
        var offset = 0;
        for (var i = 0; i < bodies[0].length; ++i) {
            var minX = Infinity;
            for (var j = 0; j < bodies.length; ++j) {
                minX = Math.min(minX, bodies[j][i].x);
            }
            for (var j = 0; j < bodies.length; ++j) {
                if (bodies[j][i].isRest && bodies[j][i].note.isWholebar) {
                    // Centered notes are already perfect.
                } else {
                    bodies[j][i].x = minX - offset;
                }
            }
        }
    }

    calcFontSize(): number {
        var scaling = this._layout.header.defaults.scaling;
        return scaling.millimeters / scaling.tenths * 40;
    }
    calcLineSpacing(print: C.Print = C.getPrint(this._layout.header)): number {
        return print.systemLayout.systemDistance;
    }

    private _assertAligned() {
        if (this._assertionPolicy === AssertionPolicy.Strict) {
            var expectedLength = 0;
            var bodies: Model[][] = [];
            for (var i = 0; i < this._parts.length; ++i) {
                if (this._parts[i].body) {
                    expectedLength = expectedLength || this._parts[i].body.length;
                    assert.equal(expectedLength, this._parts[i].body.length, "All parts must be the same length");
                    bodies.push(this._parts[i].body);
                }
            }
            for (var i = 0; i < bodies[0].length; ++i) {
                for (var j = 1; j < bodies.length; ++j) {
                    assert.equal(bodies[j][i].priority, bodies[0][i].priority, "All parts must be aligned");
                }
            }
        }
    }

    private _assertionPolicy: AssertionPolicy;

    /**
     * Whether this context is being run by a beam group
     * @scope private
     */
    isBeam: boolean;

    /**
     * Whether the entry point is invalid. If so, retrying from entry
     * inefficiently starts from the beginning of the song.
     * @scope private
     */
    nullEntry: boolean = false;

    /**
     * The parts to be annotated.
     * @scope private
     */
    _parts: Array<C.IPart>;

    _layout: ILayoutOpts;
    print: C.Print;
    _attributes: C.MusicXML.Attributes;
    get attributes() {
        return this._attributes || {};
    }
    set attributes(a: C.MusicXML.Attributes) {
        if(!!a && !(a instanceof AttributesModel)) {
            a = new AttributesModel(a, true);
        }
        this._attributes = a;
    }

    /**
     * @scope private
     */
    lines: Array<ILineSnapshot> = [];
}

export enum SplicePolicy {
    /**
     * Remove models from non-current parts, unless they have the same type as an element
     * in the new part. This is the default policy.
     */
    MatchedOnly = 1,
    /**
     * Never remove elements from any part.
     */
    Additive = 2,
    /**
     * Never remove elements from non-current parts.
     * This policy can only be used when splicing durations or duration placeholders
     * from a sub-array with durations or duration placeholders.
     */
    Masked = 3,
    /**
     * Like MatchedOnly, but shorten durations in other parts when replacing them.
     * This is used for changing the time signature.
     */
    ShortenOtherParts = 4,
    /**
     * Remove models from non-current parts.
     */
    Subtractive = 5
}

export enum AssertionPolicy {
    Strict = 0,
    NoAssertions = 1
}

export interface ICustomAction {
    toolFn?: (obj: Model, ctx: Context) => C.IterationStatus;
    pointerData: C.IPointerData;
}

export interface ILayoutOpts {
    header: C.ScoreHeader;
    snapshot?: ICompleteSnapshot;
}

/**
 * A subset of a Context that is used as a snapshot so that modifying a line
 * does not involve a trace from the start of the document. Some of these properties
 * are part-specific.
 * 
 * WARNING: If you change this, you may also want to change PrivIterator._rectify!
 */
export interface ILineSnapshot {
    accidentalsByStave: Array<C.IAccidentals>;
    bar: number;
    barKeys: Array<string>;
    barlineX: Array<number>;
    beat: number;
    line: number;
    pageLines: Array<number>;
    pageStarts: Array<number>;
    partIdx: number;
    x: number;
    y: number;
}

/**
 * A subset of a Context that is used as a snapshot so that modifying a document
 * does not require a fresh context. Holds the layout scope of a context, in
 * contrast to ILineSnapshot which holds the line context.
 */
export interface IPartialSnapshot {
    fontSize: number;
    maxX: number;
    maxY: number;
    attributes: C.MusicXML.Attributes;
    prevLine: ILineSnapshot;
    partialLine: ILineSnapshot;
}

export interface ICompleteSnapshot extends IPartialSnapshot {
    lines: Array<ILineSnapshot>;
}

export function recordMetreData(parts: Array<C.IPart>) {
    "use strict";
    try {
        // Rumor is that the v8 optimizing compiler doesn't optimize functions
        // with try-catch.
        _recordMetreData(parts);
    } catch (err) {
        switch(true) {
            case (err instanceof AttributesModel.AttributesUndefinedException):
                return;
            default:
                throw err;
        }
    }
}

function _recordMetreData(parts: Array<C.IPart>) {
    "use strict";
    var i: number;
    var j: number;
    for (i = 0; i < parts.length; ++i) {
        var body = parts[i].body;
        if (!body) { continue; }
        var mctx1 = new C.MetreContext;
        for (j = 0; j < body.length; ++j) {
            body[j].recordMetreDataImpl(mctx1);
        }
    }
}

///////////   END OF EXPORTS   ///////////






/**
 * Internal. Iterates over a set of bodies in parts and annotates them. Owned by an Annotator.
 */
class PrivIterator {
    constructor(parent: Context, from: C.ILocation, parts: Array<C.IPart>,
            mutation: ICustomAction, cursor: C.IVisualCursor, assertionPolicy: AssertionPolicy) {
        this._parent = parent;
        this._parts = parts;
        this._cursor = cursor;
        this._from = from;
        this._parent.loc = C.JSONx.clone(from);
        this._assertionPolicy = assertionPolicy;
        this._canExitAtNewline = !!mutation && !!mutation.toolFn;
        var visibleSidx = -1;
        recordMetreData(this._parts);
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                ++visibleSidx;
                var isMutable = mutation && mutation.pointerData && mutation.pointerData.partIdx === i;
                this._components.push(new PrivIteratorComponent(
                    /* starting location*/ from,
                    /* part */ parts[i],
                    /* part index */ i,
                    /* visible part index*/ visibleSidx,
                    /* custom action */ isMutable ? mutation : null,
                    /* visual cursor */ cursor,
                    this._assertionPolicy));
            }
        }
        this._assertOffsetsOK();
    }

    annotate(verbose: boolean): C.IterationStatus {
        this._assertOffsetsOK();
        // Statuses with higher numbers go back further. Return the highest one.
        var maxStatus: C.IterationStatus = C.IterationStatus.ExitEarly;

        var origSnapshot: ILineSnapshot = C.JSONx.clone(this._parent.captureLine());
        var componentSnapshots: Array<ILineSnapshot> = [];
        var filtered = false;

        for (var i = 0; i < this._components.length; ++i) {
            this._ensureCurrPrioritiesMatch();
            if (this.atEnd) {
                // All parts are now at the end.
                this._assertOffsetsOK();
                return C.IterationStatus.RetryCurrent; // Don't go to next!
            }

            this._parent.y = origSnapshot.y;
            for (var j = 0; j < i; ++j) {
                this._parent.y += this._parent.staveSpacing;
            }

            this._assertOffsetsOK();

            // The most important line:
            var componentStatus = this._components[i].annotate(this._parent, this._canExitAtNewline);

            this._assertOffsetsOK();

            if (verbose) {
                console.log(i, this._components[i]._idx, C.Type[this._components[i].curr.type],
                    C.Type[this._components[i].curr.priority],
                    C.IterationStatus[componentStatus]);
            }

            switch(componentStatus) {
                case C.IterationStatus.LineCreated:
                    this._clearCursor();
                    this._markLineDirty();
                    break;
                case C.IterationStatus.RetryPreviousLine:
                    this._markLineDirty();
                    break;
                case C.IterationStatus.RetryCurrentNoOptimizations:
                    this._canExitAtNewline = false;
                    break;
            }

            maxStatus = Math.max(maxStatus, componentStatus);
            var isPlaceholder = this._components[i].curr && this._components[i].curr.type === C.Type.Placeholder;
            if (!isPlaceholder) {
                componentSnapshots.push(this._parent.captureLine());
            } else {
                filtered = true;
            }
            _cpyline(this._parent, origSnapshot, NewlineMode.MiddleOfLine); // pop state
        }

        this._assertOffsetsOK();

        if (maxStatus <= C.IterationStatus.Success) {
            this._rectify(this._parent, origSnapshot, componentSnapshots, filtered);
        }

        this._assertOffsetsOK();
        return maxStatus;
    }

    /**
     * Merges information from all componentSnapshots into context.
     * 
     * @param origSnapshot the snapshot from the previous index
     * @param componentSnapshots the snapshots to merge into the context
     * @param filtered true if at least one placeholder has been removed from componentSnapshots
     */
    private _rectify(ctx: Context, origSnapshot: ILineSnapshot, componentSnapshots: Array<ILineSnapshot>, filtered: boolean) {
        // Most parameters should be the same in all components, so we just pick the first.
        // It may be worthwhile to actually check them for consistency at some point...
        ctx.bar                = componentSnapshots[0].bar;
        ctx.barKeys            = componentSnapshots[0].barKeys || [];
        ctx.barlineX           = componentSnapshots[0].barlineX;
        ctx.line               = componentSnapshots[0].line;
        ctx.pageLines          = componentSnapshots[0].pageLines;
        ctx.pageStarts         = componentSnapshots[0].pageStarts;

        // When "filtered" is true, some placeholders have been removed, and the vertical location will be corrected
        // later.
        if (!filtered) {
            ctx.y              = componentSnapshots[0].y;
        }

        // The current beat that the context records is the lagging (minimum from all parts) beat.
        // Note: the maxiumum beat in any of the parts is tracked in ctx.__globalBeat__
        ctx.beat               = _.min(componentSnapshots, "beat").beat;
        for (var i = 0; i < this._components.length; ++i) {
            if (    this._components[i].nextLocation.bar === ctx.bar &&
                    this._components[i].nextLocation.beat  < ctx.beat) {
                ctx.beat       = this._components[i].nextLocation.beat;
            }
        }

        // The horizontal location usually depends on the mergePolicy of the Model.
        // All models of a given type have the same priority.
        var mergePolicy        = ctx.curr.xPolicy;
        assert(!!mergePolicy, "mergePolicy can't be .Invalid, 0, of otherwise falsy");
        ctx.x                  = componentSnapshots[0].x;
        for (var i = 1; i < componentSnapshots.length; ++i) {
            var fn             = mergePolicy === C.RectifyXPolicy.Max ? Math.max : Math.min;
            ctx.x              = fn(ctx.x, componentSnapshots[i].x);
        }

        // The exception to this rule occurs when different parts disagree about how much space is needed.
        // We should usually believe the real (not placeholder) model that reports the smallest number.
        // This can sadly cause some strange (overly large) spacing for Durations that do not line up.
        var minX               = Infinity;
        var otherContexts      = ctx.findVertical(c => true);
        for (var i = 0; i < otherContexts.length; ++i) {
            minX               = Math.min(otherContexts[i].x, minX);
        }
        for (var i = 0; i < otherContexts.length; ++i) {
            otherContexts[i].x = minX;
        }

        // Accidentals are kept seperate per part.
        ctx.accidentalsByStave = componentSnapshots[0].accidentalsByStave;
        for (var i = 1; i < componentSnapshots.length; ++i) {
            var partIdx        = componentSnapshots[i].partIdx;
            ctx.accidentalsByStave[partIdx]
                               = componentSnapshots[i].accidentalsByStave[partIdx];
        }
    }

    next(status: C.IterationStatus) {
        switch (status) {
            case C.IterationStatus.Success:
                this._increment();
                break;
            case C.IterationStatus.ExitEarly:
                for (var i = 0; i < this._components.length; ++i) {
                    this._components[i].markDone();
                }
                this.eofJustificationDirty = false;
                break;
            case C.IterationStatus.RetryFromEntry:
                this._reset();
                break;
            case C.IterationStatus.LineCreated:
                this._rollbackLine(this._parent.line);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case C.IterationStatus.RetryPreviousLine:
                this._rollbackLine(this._parent.line - 1);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case C.IterationStatus.RetryLine:
                this._rollbackLine(this._parent.line);
                this._rewind(C.Type.NewLine);
                this._increment();
                break;
            case C.IterationStatus.LineRemoved:
                this._rollbackLine(this._parent.line - 1);
                break;
            case C.IterationStatus.RetryBeam:
                this._parent.loc.beat = this._parent.startOfBeamBeat;
                this._rewind(C.Type.BeamGroup);
                this._parent.x = this._componentWithPriority(C.Type.BeamGroup).x;
                break;
            case C.IterationStatus.RetryCurrent:
            case C.IterationStatus.RetryCurrentNoOptimizations:
                this._ensureCurrPrioritiesMatch();
                break;
            default:
                assert(false, "Invalid status");
        }

        this._assertOffsetsOK();

        if (status !== C.IterationStatus.Success) {
            recordMetreData(this._parts);
        }

        this._assertOffsetsOK();
    }

    get atEnd(): boolean {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._components[i].atEnd) {
                return true;
            }
        }
        return false;
    }

    // This is kind of ugly. Another (probably better) option would be to have a
    // EndOfFileModel which handles the semi-justification for the end of the song.
    eofJustificationDirty: boolean = true;

    private _assertOffsetsOK() {
        if (this._assertionPolicy === AssertionPolicy.NoAssertions) {
            return;
        }
        var n = this._components[0]._idx;
        var len = this._components[0].len;
        for (var k = 0; k < this._components.length; ++k) {
            assert(n === this._components[k]._idx, "Invalid offset");
            if (len !== this._components[k].len) {
                assert(false, "Mismatched body lengths");
            }
        }
    }

    private _componentWithPriority(type: C.Type): Model {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._components[i].curr.priority === type) {
                return this._components[i].curr;
            }
        }
        assert(false, "Not reached");
        return null;
    }

    private _rewindTwoNewlines() {
        for (var i = 0; i < this._components.length; ++i) {
            this._components[i].rewind(C.Type.NewLine);
            this._components[i].rewind();
            this._components[i].rewind(C.Type.NewLine);
        }
    }

    private _rewind(type: C.Type) {
        var nextLoc = new C.Location(MIN_LOCATION);
        var i: number;

        for (i = 0; i < this._components.length; ++i) {
            this._components[i].rewind();
            var loc = this._components[i].lastOf(type);
            if (nextLoc.le(loc)) {
                nextLoc = loc;
            }
        }
        for (i = 0; i < this._components.length; ++i) {
            this._components[i].rewindSeek(nextLoc, type);
        }
    }

    private _rollbackLine(i: number) {
        this._parent.line               = i;
        _cpyline(this._parent, this._parent.lines[this._parent.line], NewlineMode.StartOfLine);
    }

    private _increment() {
        var nextLoc = new C.Location(MAX_LOCATION);
        var nextPriority = C.MAX_NUM;
        this._assertOffsetsOK();

        for (var i = 0; i < this._components.length; ++i) {
            var pri = this._components[i].nextPriority;
            var loc = this._components[i].nextLocation;
            if (pri !== C.MAX_NUM && nextLoc.ge(loc) && nextPriority > pri) {
                nextLoc = new C.Location(loc);
                nextPriority = pri;
            }
        }
        this._assertOffsetsOK();

        for (var j = 0; j < this._components.length; ++j) {
            this._components[j].trySeek(nextPriority);
        }
        this._assertOffsetsOK();

        // this._parent.loc = nextLoc;
        // Q: Why don't we do this?
        // A: Durations and barlines themselves will set the location, annotating things as
        //    required.
    }

    private _ensureCurrPrioritiesMatch() {
        var pri = C.Type.Unknown;
        _.every(this._components, c => {
            if (c.curr) {
                pri = Math.min(pri, c.curr.type);
            }
        });
        if (pri !== C.Type.Unknown) {
            _.each(this._components, (c: PrivIteratorComponent) => {
                if (!c.curr) {
                    c.ensurePriorityIs(pri);
                }
            });
        }
    }

    private _clearCursor() {
        if (this._cursor && this._parent.line === this._cursor.annotatedLine) {
            this._cursor.annotatedLine = null;
            this._cursor.annotatedObj = null;
            this._cursor.annotatedPage = null;
            this._cursor.annotatedStave = null;
        }
    }

    private _markLineDirty() {
        if (this._parent.songEditor) {
            this._parent.songEditor.dangerouslyMarkRendererLineDirty(this._parent.line);
        }
        this._canExitAtNewline = false;
    }

    private _reset() {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._parent.nullEntry) {
                this._from = {
                    bar: 1,
                    beat: 0
                };
            }
            this._components[i].reset(this._from);
        }
    }

    private _canExitAtNewline: boolean = false;
    private _components: Array<PrivIteratorComponent> = [];
    private _cursor: C.IVisualCursor;
    private _from: C.ILocation;
    private _parent: Context;
    private _parts: Array<C.IPart>;
    private _assertionPolicy: AssertionPolicy;
}






/**
 * Internal. Tracks the position of a body in an PrivIterator. Owned by an PrivIterator.
 */
class PrivIteratorComponent {
    constructor(from: C.ILocation, part: C.IPart, idx: number, visibleIdx: number, mutation: ICustomAction,
            cursor: C.IVisualCursor, assertionPolicy: AssertionPolicy) {
        this._part = part;
        this._body = part.body;
        this._sidx = idx;
        this._visibleSidx = visibleIdx;
        this._cursor = cursor;
        this._assertionPolicy = assertionPolicy;
        this.reset(from);

        assert(this._location.eq(from));
        this._mutation = mutation;
    }

    annotate(ctx: Context, canExitAtNewline: boolean): C.IterationStatus {
        if (this._beat !== null) {
            ctx.__globalBeat__ = ctx.beat;
            ctx.beat = this._beat;
        }
        ctx.body = this._body;
        ctx.currStave = this._part;
        ctx.currStaveIdx = this._sidx;
        ctx.idx = this._idx;

        var doCustomAction = this._shouldDoCustomAction(ctx);
        var shouldUpdateVC = this._shouldUpdateVC(ctx);
        if (this._aheadOfSchedule(ctx)) {
            return this._addPadding(ctx);
        }

        ///
        var status = doCustomAction ? this._doCustomAction(ctx) : this._body[this._idx].annotate(ctx);
        this._nextBeat = ctx.beat;
        ///

        var isClean = status === C.IterationStatus.Success && !this._mutation && (!this._cursor || this._cursor.annotatedObj);
        var isNewline = this.curr && this.curr.type === C.Type.NewLine;

        if (status === C.IterationStatus.Success && shouldUpdateVC) {
            this._cursor.annotatedObj = this.curr;
            this._cursor.annotatedStave = this._visibleSidx;
            this._cursor.annotatedLine = ctx.line;
            this._cursor.annotatedPage = ctx.pageStarts.length - 1;
        }


        if (canExitAtNewline && isNewline && isClean) {
            return C.IterationStatus.ExitEarly;
        }

        return status;
    }

    reset(from: C.ILocation) {
        this._idx = -1;
        // Important: If bar === 1, this function resets it to the first element.
        // Otherwise, it resets it to the beginning of a line.
        do {
            this._location = new C.Location(this._body[++this._idx].ctxData);
        } while ((from.bar !== 1 || from.beat !== 0) &&
            (this._location.lt(from) || this._location.eq(from) && (!this.curr ||
            this.curr.priority <= C.Type.Begin || this.curr.priority === C.Type.Barline)));
        this._updateSubctx();
    }

    rewind(priority?: C.Type) {
        if (!priority) {
            --this._idx;
        } else {
            while (this._idx >= 0 && this._body[this._idx].priority !== priority) {
                --this._idx;
            }
        }
        this._updateSubctx();
    }

    /**
     * Seek to the location at 'loc' with priority <= 'priority', or if none exists,
     * the location just before 'loc'.
     */
    rewindSeek(loc: C.Location, priority: number) {
        while (this._idx >= 0 && (
                !this._body[this._idx].ctxData ||
                loc.lt(this._body[this._idx].ctxData) ||
                loc.eq(this._body[this._idx].ctxData) && this._body[this._idx].priority > priority)) {
            --this._idx;
        }
        this._updateSubctx();
    }

    _updateSubctx() {
        if (this.curr && this.curr.ctxData) {
            this._beat = this.curr.ctxData.beat;
            this._nextBeat = null;
        } else {
            this._beat = null;
            this._nextBeat = null;
        }
    }

    trySeek(priority: number) {
        this.ensurePriorityIs(priority);
        ++this._idx;
        assert(this.nextPriority === C.MAX_NUM || this.curr);
    }

    ensurePriorityIs(priority: number) {
        if (this._assertionPolicy === AssertionPolicy.Strict) {
            assert.equal(this.nextPriority, priority, "Priorities must be aligned");
        } else if (this.nextPriority !== priority) {
            var nextIsPlaceholder = this._body[this._idx + 1] && this._body[this._idx + 1].placeholder;
            var PlaceholderModel: typeof PlaceholderModelType = require("./placeholder");
            this._body.splice(this._idx + 1, nextIsPlaceholder ? 1 : 0,
                new PlaceholderModel({ priority: priority }, true /* ? */));
        }
    }

    /**
     * Returns the position of the last item with priority 'priority'.
     */
    lastOf(priority: C.Type): C.Location {
        var i = this._idx;
        while (i > 0 && this._body[i].priority !== priority) {
            --i;
        }
        return new C.Location(this._body[i].ctxData);
    }

    /**
     * Hack to make this.atEnd true.
     */
    markDone(): void {
        this._idx = this._body.length;
    }

    get nextLocation(): C.ILocation {
        var next = this._next;
        return next ? next.ctxData : MAX_LOCATION;
    }

    get nextPriority(): number {
        var next = this._next;
        return next ? next.priority : C.MAX_NUM;
    }

    get atEnd(): boolean {
        return !this._body[this._idx];
    }

    get curr(): Model {
        return this._body[this._idx];
    }

    get len() {
        return this._body.length;
    }

    private _aheadOfSchedule(ctx: Context): boolean {
        if (ctx.curr.type !== C.Type.Duration) {
            return false;
        }
        var space = !!(ctx.findVertical(c => c.type !== C.Type.Placeholder && c !== ctx.curr).length);
        return space && ctx.curr.type !== C.Type.Placeholder && ctx.beat > ctx.__globalBeat__;
    }

    private _addPadding(ctx: Context) {
        var PlaceholderModel = require("./placeholder");
        ctx.splice(ctx.idx, 0, [new PlaceholderModel({
            priority: ctx.curr.priority
        }, true /* ? */)], SplicePolicy.Additive);
        ctx.beat = ctx.__globalBeat__;
        return C.IterationStatus.RetryCurrentNoOptimizations;
    }

    private get _next() {
        this._beat = this._nextBeat;
        return this._body[this._idx + 1];
    }

    private _shouldDoCustomAction(ctx: Context): boolean {
        if (!this._mutation) { return false; }

        var target = this._mutation.pointerData.obj;
        return target === this.curr || (target.placeholder && target.idx === this._idx);
    }

    private _shouldUpdateVC(ctx: Context): boolean {
        if (!this._cursor) { return false; }
        if (!ctx.curr) { return false; }

        var target = this._cursor;
        var barMatches = ctx.bar === target.bar;
        var beatMatches = (!target.beat && !target.annotatedObj) || ctx.beat === target.beat;
        var typeMatches = (ctx.curr.isNote && !target.endMarker) || (target.endMarker && ctx.curr.type === C.Type.EndMarker);

        return !this._mutation && // Wait until mutation has occurred & _mutation is unset.
            barMatches && beatMatches && typeMatches && !target.annotatedObj;
    }


    private _doCustomAction(ctx: Context): C.IterationStatus {
        var exitCode = this._mutation.toolFn(this.curr, ctx);

        this._mutation = null;  // Don't repeat this action, even if we backtrack.
        return exitCode;
    }

    private _assertionPolicy:   AssertionPolicy;
    private _beat:              number           = null;
    private _nextBeat:          number			 = null;
    private _body:              Model[];
    private _cursor:            C.IVisualCursor;
    public  _idx:               number;
    private _location:          C.Location;
    private _mutation:          ICustomAction;
    private _sidx:              number;
    private _visibleSidx:       number;
    private _part:              C.IPart;
}





function _cpyline(ctx: Context, line: ILineSnapshot, mode: NewlineMode) {
    "use strict";

    if (!!line.accidentalsByStave  ) { ctx.accidentalsByStave = line.accidentalsByStave; }
    if (  line.bar         !== null) { ctx.bar                = line.bar;                }
    if (!!line.barlineX    !== null) { ctx.barlineX           = line.barlineX;           }
    if (!!line.barKeys     !== null) { ctx.barKeys            = line.barKeys;            }
    if (  line.beat        !== null) { ctx.beat               = line.beat;               }
    if (  line.line        !== null) { ctx.line               = line.line;               }
    if (!!line.pageLines           ) { ctx.pageLines          = line.pageLines;          }
    if (!!line.pageStarts          ) { ctx.pageStarts         = line.pageStarts;         }
    if (  line.x           !== null) { ctx.x                  = line.x;                  }
    if (  line.y           !== null) { ctx.y                  = line.y;                  }
}

enum NewlineMode {
    StartOfLine,
    MiddleOfLine
}

function _cpysnapshot(ctx: Context, layout: ICompleteSnapshot) {
    "use strict";

    _.each(layout, (v, attrib) => {
        if ((<any>layout)[attrib] === null) {
            return;
        }
        switch (attrib) {
            case "lines":
                ctx.lines = layout.lines;
            	ctx.line  = layout.lines.length - 1;
                _cpyline(ctx, ctx.lines[ctx.line], NewlineMode.StartOfLine);
                break;
            case "fontSize":    ctx.fontSize   = layout.fontSize;   break;
            case "maxX":        ctx.maxX       = layout.maxX;       break;
            case "maxY":        ctx.maxY       = layout.maxY;       break;
            case "attributes":  ctx.attributes = layout.attributes; break;
            case "partialLine": /* pass */                          break;
            case "prevLine":    /* pass */                          break;
            default:            assert(false, "Not reached");
        }
    });
}

var MAX_LOCATION = new C.Location({
    bar:  C.MAX_NUM,
    beat: C.MAX_NUM
});

var MIN_LOCATION = new C.Location({
    bar:  -1,
    beat: -1
});
