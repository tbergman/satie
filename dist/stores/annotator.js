var _ = require("lodash");
var assert = require("assert");
var C = require("./contracts");
var Context = (function () {
    function Context(parts, layout, editor, assertionPolicy) {
        this.startOfBeamBeat = NaN;
        this.accidentalsByStave = [];
        this.barlineX = [];
        this.line = 0;
        this.loc = {
            bar: 1,
            beat: 0
        };
        this.pageLines = [0];
        this.pageStarts = [0];
        this.smallest = 10000;
        this.minBottomPaddings = [];
        this.minTopPaddings = [];
        this.disableRecordings = true;
        this._recordings = null;
        this.nullEntry = false;
        this.lines = [];
        this._parts = parts;
        this._layout = layout;
        this._assertionPolicy = assertionPolicy;
        this.songEditor = editor;
        if (layout) {
            if (layout.snapshot) {
                _cpysnapshot(this, layout.snapshot);
            }
            else {
                this.lines = [this.captureLine()];
            }
        }
    }
    Context.prototype.annotate = function (from, cursor, disableRecording, dispatcher) {
        assert(!Context._ANNOTATING, "annotate() may not be called recursively.");
        Context._ANNOTATING = true;
        var error = null;
        var result;
        assert(from.bar !== 0);
        assert(this._parts, "Staves must be set!");
        try {
            result = this._annotateImpl(from, cursor, disableRecording);
        }
        catch (err) {
            error = err;
        }
        Context._ANNOTATING = false;
        if (error) {
            this.abort();
        }
        return result;
    };
    Context.prototype.abort = function () {
        assert(false, "Could not render");
    };
    Context.prototype.captureLine = function () {
        return {
            accidentalsByStave: C.JSONx.clone(this.accidentalsByStave),
            bar: this.loc.bar,
            barKeys: this.barKeys,
            barlineX: this.barlineX,
            beat: this.loc.beat,
            attributes: this.attributes,
            line: this.line,
            invisibleForBars: this.invisibleForBars,
            pageLines: this.pageLines,
            pageStarts: this.pageStarts,
            partIdx: this.currStaveIdx,
            x: this.x,
            y: this.y
        };
    };
    Context.prototype.captureSnapshot = function () {
        return {
            fontSize: this.fontSize,
            maxX: this.maxX,
            maxY: this.maxY,
            prevLine: this.lines[this.line - 1],
            partialLine: this.lines[this.line],
            attributes: this.attributes
        };
    };
    Object.defineProperty(Context.prototype, "curr", {
        get: function () {
            return this.body[this.idx];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Context.prototype, "staveSpacing", {
        get: function () {
            var print = C.getPrint(this._layout.header);
            var staffLayout = print.staffLayouts[this.currStaveIdx];
            var staffSpacing = staffLayout ? staffLayout.staffDistance : null;
            switch (true) {
                case !isNaN(staffSpacing):
                    return staffSpacing;
                case !isNaN(print.staffSpacing):
                    return print.staffSpacing;
                default:
                    return 0;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Context.prototype, "page", {
        get: function () {
            for (var i = 0; i < this.pageStarts.length; ++i) {
                if (this.pageStarts[i] < this.line) {
                    return i;
                }
            }
            return this.pageStarts.length;
        },
        enumerable: true,
        configurable: true
    });
    Context.prototype.next = function (condition, skip, allowModifiers) {
        var i;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && ((this.body[this.idx + i].isModifier && !allowModifiers) || (condition && !condition(this.body[this.idx + i])))) {
            ++i;
        }
        return this.body[this.idx + i];
    };
    Context.prototype.nextIdx = function (cond, skip, allowModifiers) {
        var i;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && ((this.body[this.idx + i].isModifier && !allowModifiers) || (cond && !cond(this.body[this.idx + i], this.idx + i)))) {
            ++i;
        }
        return this.idx + i;
    };
    Context.prototype.intersects = function (type, idx, after, before) {
        if (idx === void 0) { idx = this.idx; }
        if (after === void 0) { after = true; }
        if (before === void 0) { before = true; }
        var intersects = [];
        for (var i = 0; i < this._parts.length; ++i) {
            var body = this._parts[i].body;
            if (!body) {
                continue;
            }
            if (before) {
                for (var j = idx - 1; j >= 0; --j) {
                    if (body[j].type === type) {
                        intersects.push(body[j]);
                    }
                    if (body[j].priority === 600 /* Duration */) {
                        break;
                    }
                }
            }
            if (body[idx].type === type) {
                intersects.push(body[idx]);
            }
            if (after) {
                for (var j = idx + 1; j < body.length; ++j) {
                    if (body[j].type === type) {
                        intersects.push(body[j]);
                    }
                    if (body[j].priority === 600 /* Duration */) {
                        break;
                    }
                }
            }
        }
        return intersects;
    };
    Context.prototype.beamFollows = function (idx) {
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        var inBeam = this.body[idx + 1].priority === 450 /* BeamGroup */;
        if (inBeam) {
            var beamed = [];
            for (var i = 0; i < this._parts.length; ++i) {
                if (this._parts[i].body && this._parts[i].body[idx + 1].type === 450 /* BeamGroup */) {
                    var newBeam = this._parts[i].body[idx + 1].beam;
                    beamed = beamed.concat(newBeam);
                }
            }
            return beamed;
        }
        else {
            return null;
        }
    };
    Context.prototype.removeFollowingBeam = function (idx, past) {
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        assert(past || idx >= this.idx, "Set past to true if you are " + "removing an already-processed beam (this is inefficient)");
        var beam = this.beamFollows(idx);
        assert(beam, "There must be a beam to remove");
        beam.forEach(function (p) {
            p.inBeam = false;
        });
        return (past ? this.erasePast : this.eraseFuture).call(this, idx + 1);
    };
    Context.prototype.prev = function (condition, offset) {
        if (!condition) {
            return this.body[this.idx - 1];
        }
        else {
            for (var i = this.idx - (isNaN(offset) ? 1 : offset); i >= 0; --i) {
                if (condition(this.body[i])) {
                    return this.body[i];
                }
            }
            return null;
        }
    };
    Context.prototype.eraseCurrent = function (splicePolicy) {
        if (splicePolicy === void 0) { splicePolicy = 3 /* Masked */; }
        this.splice(this.idx, 1, null, splicePolicy);
        return 20 /* RetryCurrent */;
    };
    Context.prototype.eraseFuture = function (idx) {
        assert(idx > this.idx, "Invalid use of eraseFuture");
        this.splice(idx, 1, null);
        return 10 /* Success */;
    };
    Context.prototype.erasePast = function (idx) {
        assert(idx <= this.idx, "Invalid use of erasePast");
        this.splice(idx, 1);
        return 90 /* RetryFromEntry */;
    };
    Context.prototype.insertFuture = function (obj, index) {
        index = (index === null || index === undefined) ? (this.idx + 1) : index;
        assert(index > this.idx, "Otherwise, use 'insertPast'");
        if (obj.isAttribute) {
            var nidx = index;
            while (this.body[nidx] && this.body[nidx].isAttribute) {
                if (this.body[nidx].priority === obj.priority && this.body[nidx].placeholder) {
                    this.body[nidx] = obj;
                    recordMetreData(this._parts);
                    return 10 /* Success */;
                }
                ++nidx;
            }
        }
        this.splice(index, 0, [obj], obj.isNote ? 3 /* Masked */ : 2 /* Additive */);
        recordMetreData(this._parts);
        return 10 /* Success */;
    };
    Context.prototype.insertPast = function (obj, index, merge) {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");
        var exitCode = this.idx === index ? 20 /* RetryCurrent */ : 90 /* RetryFromEntry */;
        this.splice(index, 0, [obj], 2 /* Additive */);
        return exitCode;
    };
    Context.prototype.insertPastVertical = function (objs, index) {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");
        var exitCode = this.idx === index ? 20 /* RetryCurrent */ : 90 /* RetryFromEntry */;
        var visibleIdx = -1;
        for (var i = 0; i < this._parts.length; ++i) {
            var part = this._parts[i];
            if (part.body) {
                ++visibleIdx;
                part.body.splice(index, 0, objs[visibleIdx]);
            }
        }
        return exitCode;
    };
    Context.prototype.splice = function (start, count, replaceWith, splicePolicy) {
        if (splicePolicy === void 0) { splicePolicy = 1 /* MatchedOnly */; }
        var PlaceholderModel = require("./placeholder");
        assert(!isNaN(start));
        assert(!isNaN(count));
        if (splicePolicy === 2 /* Additive */) {
            assert(!count, "You cannot remove anything in Additive mode");
        }
        replaceWith = replaceWith || [];
        this._assertAligned();
        if (splicePolicy === 3 /* Masked */) {
            var end = start + count - replaceWith.length;
            for (var i = end - 1; i >= start; --i) {
                var vertical = this.findVertical(function (m) { return !m.placeholder; }, i);
                if (vertical.length > 1 || vertical.length === 1 && vertical[0] !== this.body[i]) {
                    replaceWith = [new PlaceholderModel({
                        priority: vertical[0].priority
                    }, vertical[0].annotated)].concat(replaceWith);
                }
            }
        }
        if (this.body[start]) {
            var ctxStartData = this.body[start].ctxData;
            var startPriority = this.body[start].priority;
        }
        else {
            assert(this._assertionPolicy === 1 /* NoAssertions */);
        }
        for (var i = 0; i < this._parts.length; ++i) {
            var part = this._parts[i];
            if (part.body) {
                if (this.body === part.body) {
                    if (replaceWith) {
                        Array.prototype.splice.apply(part.body, [start, count].concat(replaceWith));
                    }
                    else {
                        part.body.splice(start, count);
                    }
                }
                else {
                    var placeholders = [];
                    var vidx = start;
                    var fidx = start + count;
                    var ffidx = start + replaceWith.length;
                    var offset = 0;
                    for (var j = 0; j < replaceWith.length; ++j) {
                        if (splicePolicy !== 5 /* Subtractive */ && vidx + j < Math.max(ffidx, fidx) && part.body[vidx + j] && part.body[vidx + j].priority === replaceWith[j].priority) {
                            if (vidx + j >= fidx) {
                                placeholders.push(new PlaceholderModel({
                                    priority: replaceWith[j].priority
                                }, replaceWith[j].annotated));
                            }
                            else {
                                placeholders.push(part.body[vidx + j]);
                                if (splicePolicy === 4 /* ShortenOtherParts */) {
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
                        }
                        else {
                            placeholders.push(new PlaceholderModel({
                                priority: replaceWith[j].priority
                            }, replaceWith[j].annotated));
                        }
                    }
                    if (replaceWith && replaceWith.length && count === 0 && ctxStartData) {
                        while (startPriority > 300 /* Barline */ && replaceWith[0].priority > 300 /* Barline */ && part.body[start + offset] && part.body[start + offset].ctxData && part.body[start + offset].priority > 300 /* Barline */ && new C.Location(part.body[start + offset].ctxData).lt(ctxStartData)) {
                            ++offset;
                        }
                    }
                    Array.prototype.splice.apply(part.body, [start + offset, count].concat(placeholders));
                }
            }
        }
        this._assertAligned();
        if (splicePolicy === 3 /* Masked */) {
            var clot = start - 1;
            while (this.body[clot + 1] && this.body[clot + 1].priority > 300 /* Barline */) {
                ++clot;
            }
            if (clot >= start) {
                while (this.body[start - 1] && this.body[start - 1].priority > 300 /* Barline */) {
                    --start;
                }
            }
            this._realign(start, clot);
            this._assertAligned();
        }
    };
    Context.prototype.removeAdjacentBeams = function (note) {
        var obj = this.curr;
        if (obj.inBeam) {
            var i = this.idx;
            while (i >= 0 && this.body[i].type !== 450 /* BeamGroup */) {
                --i;
            }
            var tuplet = this.body[i].tuplet;
            if (tuplet && note) {
                note.tuplet = C.JSONx.clone(tuplet);
            }
            this.removeFollowingBeam(i - 1, true);
            --this.idx;
            return 60 /* RetryLine */;
        }
        else if (this.beamFollows()) {
            this.removeFollowingBeam();
            return 20 /* RetryCurrent */;
        }
        return 10 /* Success */;
    };
    Context.prototype.removeRemainingBeamsInBar = function () {
        for (var i = this.idx + 1; this.body[i].priority !== 110 /* EndMarker */; ++i) {
            if (this.body[i].priority === 450 /* BeamGroup */) {
                this.removeFollowingBeam(i - 1);
                --i;
            }
        }
        return 10 /* Success */;
    };
    Context.insertPlaceholders = function (parts) {
        var PlaceholderModel = require("./placeholder");
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
            var bestPri = 1111 /* Unknown */;
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
    };
    Context.prototype._realign = function (start, end) {
        var PlaceholderModel = require("./placeholder");
        var bodies = this._parts.filter(function (s) { return !!s.body; }).map(function (s) { return s.body; });
        var cBeats = bodies.map(function (b) { return 0; });
        var placeholders = bodies.map(function (b) { return []; });
        var reals = bodies.map(function (b) { return []; });
        var aligned = bodies.map(function (b) { return []; });
        for (var i = start; i <= end; ++i) {
            for (var j = 0; j < bodies.length; ++j) {
                if (this._assertionPolicy !== 0 /* Strict */ && !bodies[j][i]) {
                    break;
                }
                var valid = bodies[j][i].priority > 300 /* Barline */;
                if (this._assertionPolicy === 0 /* Strict */) {
                    assert(valid, "Realign only takes durations and modifiers.");
                }
                if (bodies[j][i].placeholder) {
                    placeholders[j].push(bodies[j][i]);
                }
                else {
                    reals[j].push(bodies[j][i]);
                }
            }
        }
        while (_.any(reals, function (r) { return r.length; })) {
            var thisBeat = _.min(reals.map(function (r, j) { return r.length ? cBeats[j] : 100000; }));
            var thisPriority = _.min(reals.map(function (r, j) { return r.length && cBeats[j] === thisBeat ? r[0].priority : 100000; }));
            for (var j = 0; j < bodies.length; ++j) {
                if (reals[j].length && (cBeats[j] === thisBeat) && reals[j][0].priority === thisPriority) {
                    if (reals[j][0].isNote) {
                        cBeats[j] += reals[j][0].calcBeats(this);
                    }
                    aligned[j] = aligned[j].concat(reals[j].splice(0, 1));
                }
                else {
                    if (!placeholders[j][0] || placeholders[j][0].priority !== thisPriority) {
                        console.warn("Sketchily adding a new placeholder to fix alignment (be worried)");
                        aligned[j] = aligned[j].concat(new PlaceholderModel({ priority: thisPriority }, true));
                    }
                    else {
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
            if (this._assertionPolicy !== 1 /* NoAssertions */) {
                assert.equal(firstSize, aligned[j].length);
            }
            Array.prototype.splice.apply(this._parts[k].body, [start, end + 1 - start].concat(aligned[j]));
            ++j;
        }
        recordMetreData(this._parts);
    };
    Context.prototype.findVertical = function (where, idx) {
        if (isNaN(idx)) {
            idx = this.idx;
        }
        return _.chain(this._parts).filter(function (s) { return !!s.body; }).map(function (s) { return s.body[idx]; }).filter(function (s) { return s && (!where || !!where(s)); }).value();
    };
    Context.prototype.midiOutHint = function (out) {
        this.songEditor.midiOutHint(out);
    };
    Object.defineProperty(Context.prototype, "nextActualType", {
        get: function () {
            var i = this.idx + 1;
            while (i < this.body.length && this.body[i].type === 999 /* Placeholder */) {
                ++i;
            }
            return this.body[i] ? this.body[i].type : null;
        },
        enumerable: true,
        configurable: true
    });
    Context.prototype._barAfter = function (index) {
        for (var i = index; i < this.body.length; ++i) {
            if (this.body[i].type === 300 /* Barline */) {
                return this.body[i];
            }
        }
    };
    Object.defineProperty(Context.prototype, "ts", {
        get: function () {
            return this.attributes.time ? {
                beats: this.attributes.time.beats[0],
                beatType: this.attributes.time.beatTypes[0],
                commonRepresentation: this.attributes.time.symbol !== 5 /* Normal */
            } : null;
        },
        set: function (ts) {
            this.attributes.time = this.attributes.time || {};
            this.attributes.time.beats = [ts.beats];
            this.attributes.time.beatTypes = [ts.beatType];
            switch (true) {
                case ts.commonRepresentation && ts.beats === 4 && ts.beatType === 4:
                    this.attributes.time.symbol = 0 /* Common */;
                    break;
                case ts.commonRepresentation && ts.beats === 2 && ts.beatType === 2:
                    this.attributes.time.symbol = 1 /* Cut */;
                    break;
                default:
                    console.warn("Unknown common TS");
                case !ts.commonRepresentation:
                    this.attributes.time.symbol = 5 /* Normal */;
                    break;
            }
        },
        enumerable: true,
        configurable: true
    });
    Context.prototype.markEntireSongDirty = function () {
        this.nullEntry = true;
    };
    Object.defineProperty(Context.prototype, "beat", {
        get: function () {
            return this.loc.beat;
        },
        set: function (b) {
            this.loc.beat = b;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Context.prototype, "bar", {
        get: function () {
            return this.loc.bar;
        },
        set: function (b) {
            this.loc.bar = b;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Context.prototype, "endMarker", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Context.prototype.record = function (model) {
        this._recordings[model.key] = model;
    };
    Context.prototype.toJSON = function () {
        var serializable = {};
        for (var key in this) {
            if (this.hasOwnProperty(key) && key !== "songEditor") {
                serializable[key] = this[key];
            }
        }
        return serializable;
    };
    Context.prototype._annotateImpl = function (from, cursor, disableRecordings) {
        from = from || { bar: 1, beat: 0 };
        this.disableRecordings = disableRecordings;
        if (!this.disableRecordings) {
            this._recordings = {};
        }
        var status;
        var ops = 0;
        var initialLength = _.max(this._parts, function (s) { return s.body ? s.body.length : 0; }).body.length || 1;
        var verbose = false;
        var stopIn = NaN;
        for (var it = new PrivIterator(this, from, this._parts, cursor, this._assertionPolicy); !it.atEnd; it.next(status)) {
            if (++ops / initialLength >= 500 && isNaN(stopIn)) {
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
        return {
            cursor: null,
            operations: 5,
            resetY: false,
            skip: status === 5 /* ExitEarly */,
            success: true
        };
    };
    Context.prototype._semiJustify = function (parts) {
        var NewlineModel = require("./newline");
        var bodies = [];
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
                }
                else {
                    bodies[j][i].x = minX - offset;
                }
            }
        }
    };
    Context.prototype.calcFontSize = function () {
        var scaling = this._layout.header.defaults.scaling;
        return scaling.millimeters / scaling.tenths * 40;
    };
    Context.prototype.calcLineSpacing = function (print) {
        if (print === void 0) { print = C.getPrint(this._layout.header); }
        return Math.max(print.systemLayout.systemDistance, this.minBottomPaddings[this.currStaveIdx]);
    };
    Context.prototype._assertAligned = function () {
        if (this._assertionPolicy === 0 /* Strict */) {
            var expectedLength = 0;
            var bodies = [];
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
    };
    Object.defineProperty(Context.prototype, "attributes", {
        get: function () {
            return this._attributes || {};
        },
        set: function (a) {
            var AttributesModel = require("./attributes");
            if (!!a && !(a instanceof AttributesModel)) {
                a = new AttributesModel(a, true);
            }
            this._attributes = a;
        },
        enumerable: true,
        configurable: true
    });
    Context._ANNOTATING = false;
    return Context;
})();
exports.Context = Context;
(function (SplicePolicy) {
    SplicePolicy[SplicePolicy["MatchedOnly"] = 1] = "MatchedOnly";
    SplicePolicy[SplicePolicy["Additive"] = 2] = "Additive";
    SplicePolicy[SplicePolicy["Masked"] = 3] = "Masked";
    SplicePolicy[SplicePolicy["ShortenOtherParts"] = 4] = "ShortenOtherParts";
    SplicePolicy[SplicePolicy["Subtractive"] = 5] = "Subtractive";
})(exports.SplicePolicy || (exports.SplicePolicy = {}));
var SplicePolicy = exports.SplicePolicy;
(function (AssertionPolicy) {
    AssertionPolicy[AssertionPolicy["Strict"] = 0] = "Strict";
    AssertionPolicy[AssertionPolicy["NoAssertions"] = 1] = "NoAssertions";
})(exports.AssertionPolicy || (exports.AssertionPolicy = {}));
var AssertionPolicy = exports.AssertionPolicy;
function recordMetreData(parts) {
    "use strict";
    try {
        _recordMetreData(parts);
    }
    catch (err) {
        var AttributesModel = require("./attributes");
        switch (true) {
            case (err instanceof AttributesModel.AttributesUndefinedException):
                return;
            default:
                throw err;
        }
    }
}
exports.recordMetreData = recordMetreData;
function _recordMetreData(parts) {
    "use strict";
    var i;
    var j;
    var attributesPerIdx = {};
    for (i = 0; i < parts.length; ++i) {
        var body = parts[i].body;
        if (!body) {
            continue;
        }
        var mctx1 = new C.MetreContext;
        for (j = 0; j < body.length; ++j) {
            if (attributesPerIdx[j]) {
                mctx1.attributes = attributesPerIdx[j];
            }
            body[j].recordMetreDataImpl(mctx1);
            if (body[j].type === 145 /* Attributes */) {
                attributesPerIdx[j] = mctx1.attributes;
            }
        }
    }
}
var PrivIterator = (function () {
    function PrivIterator(parent, from, parts, cursor, assertionPolicy) {
        this.eofJustificationDirty = true;
        this._canExitAtNewline = false;
        this._components = [];
        this._parent = parent;
        this._parts = parts;
        this._cursor = cursor;
        this._from = from;
        this._parent.loc = C.JSONx.clone(from);
        this._assertionPolicy = assertionPolicy;
        var visibleSidx = -1;
        recordMetreData(this._parts);
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                ++visibleSidx;
                this._components.push(new PrivIteratorComponent(from, parts[i], i, visibleSidx, cursor, this._assertionPolicy));
            }
        }
        this._assertOffsetsOK();
    }
    PrivIterator.prototype.annotate = function (verbose) {
        this._assertOffsetsOK();
        var maxStatus = 5 /* ExitEarly */;
        var origSnapshot = C.JSONx.clone(this._parent.captureLine());
        var componentSnapshots = [];
        var filtered = false;
        for (var i = 0; i < this._components.length; ++i) {
            this._ensureCurrPrioritiesMatch();
            if (this.atEnd) {
                this._assertOffsetsOK();
                return 20 /* RetryCurrent */;
            }
            this._parent.y = origSnapshot.y;
            for (var j = 0; j < i; ++j) {
                this._parent.y += this._parent.staveSpacing;
            }
            this._assertOffsetsOK();
            var componentStatus = this._components[i].annotate(this._parent, this._canExitAtNewline);
            this._assertOffsetsOK();
            if (verbose) {
                console.log(i, this._components[i]._idx, C.Type[this._components[i].curr.type], C.Type[this._components[i].curr.priority], C.IterationStatus[componentStatus]);
            }
            switch (componentStatus) {
                case 70 /* LineCreated */:
                    this._clearCursor();
                    this._markLineDirty();
                    break;
                case 80 /* RetryPreviousLine */:
                    this._markLineDirty();
                    break;
                case 30 /* RetryCurrentNoOptimizations */:
                    this._canExitAtNewline = false;
                    break;
            }
            maxStatus = Math.max(maxStatus, componentStatus);
            var isPlaceholder = this._components[i].curr && this._components[i].curr.type === 999 /* Placeholder */;
            if (!isPlaceholder) {
                componentSnapshots.push(this._parent.captureLine());
            }
            else {
                filtered = true;
            }
            _cpyline(this._parent, origSnapshot, 1 /* MiddleOfLine */);
        }
        this._assertOffsetsOK();
        if (maxStatus <= 10 /* Success */) {
            this._rectify(this._parent, origSnapshot, componentSnapshots, filtered);
        }
        this._assertOffsetsOK();
        return maxStatus;
    };
    PrivIterator.prototype._rectify = function (ctx, origSnapshot, componentSnapshots, filtered) {
        ctx.bar = componentSnapshots[0].bar;
        ctx.barKeys = componentSnapshots[0].barKeys || [];
        ctx.barlineX = componentSnapshots[0].barlineX;
        ctx.line = componentSnapshots[0].line;
        ctx.invisibleForBars = componentSnapshots[0].invisibleForBars;
        ctx.pageLines = componentSnapshots[0].pageLines;
        ctx.pageStarts = componentSnapshots[0].pageStarts;
        if (!filtered) {
            ctx.y = componentSnapshots[0].y;
        }
        ctx.beat = _.min(componentSnapshots, "beat").beat;
        for (var i = 0; i < this._components.length; ++i) {
            if (this._components[i].nextLocation.bar === ctx.bar && this._components[i].nextLocation.beat < ctx.beat) {
                ctx.beat = this._components[i].nextLocation.beat;
            }
        }
        var mergePolicy = 0 /* Invalid */;
        for (var j = 0; j < ctx._parts.length; ++j) {
            mergePolicy = Math.max(mergePolicy, ctx._parts[j].body[ctx.idx].xPolicy);
        }
        assert(!!mergePolicy, "mergePolicy can't be .Invalid, 0, of otherwise falsy");
        ctx.x = componentSnapshots[0].x;
        for (var i = 1; i < componentSnapshots.length; ++i) {
            var fn = mergePolicy === 1 /* Max */ ? Math.max : Math.min;
            ctx.x = fn(ctx.x, componentSnapshots[i].x);
        }
        var minX = Infinity;
        var otherContexts = ctx.findVertical(function (c) { return true; });
        for (var i = 0; i < otherContexts.length; ++i) {
            minX = Math.min(otherContexts[i].x, minX);
        }
        for (var i = 0; i < otherContexts.length; ++i) {
            otherContexts[i].x = minX;
        }
        ctx.accidentalsByStave = componentSnapshots[0].accidentalsByStave;
        for (var i = 1; i < componentSnapshots.length; ++i) {
            var partIdx = componentSnapshots[i].partIdx;
            ctx.accidentalsByStave[partIdx] = componentSnapshots[i].accidentalsByStave[partIdx];
        }
    };
    PrivIterator.prototype.next = function (status) {
        switch (status) {
            case 10 /* Success */:
                this._increment();
                break;
            case 5 /* ExitEarly */:
                for (var i = 0; i < this._components.length; ++i) {
                    this._components[i].markDone();
                }
                this.eofJustificationDirty = false;
                break;
            case 90 /* RetryFromEntry */:
                this._reset();
                break;
            case 70 /* LineCreated */:
                this._rollbackLine(this._parent.line);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case 80 /* RetryPreviousLine */:
                this._rollbackLine(this._parent.line - 1);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case 60 /* RetryLine */:
                this._rollbackLine(this._parent.line);
                this._rewind(130 /* NewLine */);
                this._increment();
                break;
            case 50 /* LineRemoved */:
                this._rollbackLine(this._parent.line - 1);
                break;
            case 40 /* RetryBeam */:
                this._parent.loc.beat = this._parent.startOfBeamBeat;
                this._rewind(450 /* BeamGroup */);
                this._parent.x = this._componentWithPriority(450 /* BeamGroup */).x;
                break;
            case 20 /* RetryCurrent */:
            case 30 /* RetryCurrentNoOptimizations */:
                this._ensureCurrPrioritiesMatch();
                break;
            default:
                assert(false, "Invalid status");
        }
        this._assertOffsetsOK();
        if (status !== 10 /* Success */) {
            recordMetreData(this._parts);
        }
        this._assertOffsetsOK();
    };
    Object.defineProperty(PrivIterator.prototype, "atEnd", {
        get: function () {
            for (var i = 0; i < this._components.length; ++i) {
                if (this._components[i].atEnd) {
                    return true;
                }
            }
            return false;
        },
        enumerable: true,
        configurable: true
    });
    PrivIterator.prototype._assertOffsetsOK = function () {
        if (this._assertionPolicy === 1 /* NoAssertions */) {
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
    };
    PrivIterator.prototype._componentWithPriority = function (type) {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._components[i].curr.priority === type) {
                return this._components[i].curr;
            }
        }
        assert(false, "Not reached");
        return null;
    };
    PrivIterator.prototype._rewindTwoNewlines = function () {
        for (var i = 0; i < this._components.length; ++i) {
            this._components[i].rewind(130 /* NewLine */);
            this._components[i].rewind();
            this._components[i].rewind(130 /* NewLine */);
        }
    };
    PrivIterator.prototype._rewind = function (type) {
        var nextLoc = new C.Location(MIN_LOCATION);
        var i;
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
    };
    PrivIterator.prototype._rollbackLine = function (i) {
        this._parent.line = i;
        _cpyline(this._parent, this._parent.lines[this._parent.line], 0 /* StartOfLine */);
    };
    PrivIterator.prototype._increment = function () {
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
    };
    PrivIterator.prototype._ensureCurrPrioritiesMatch = function () {
        var pri = 1111 /* Unknown */;
        _.every(this._components, function (c) {
            if (c.curr) {
                pri = Math.min(pri, c.curr.type);
            }
        });
        if (pri !== 1111 /* Unknown */) {
            _.each(this._components, function (c) {
                if (!c.curr) {
                    c.ensurePriorityIs(pri);
                }
            });
        }
    };
    PrivIterator.prototype._clearCursor = function () {
        if (this._cursor && this._parent.line === this._cursor.annotatedLine) {
            this._cursor.annotatedLine = null;
            this._cursor.annotatedObj = null;
            this._cursor.annotatedPage = null;
            this._cursor.annotatedStave = null;
        }
    };
    PrivIterator.prototype._markLineDirty = function () {
        if (this._parent.songEditor) {
            this._parent.songEditor.dangerouslyMarkRendererLineDirty(this._parent.line);
        }
        this._canExitAtNewline = false;
    };
    PrivIterator.prototype._reset = function () {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._parent.nullEntry) {
                this._from = {
                    bar: 1,
                    beat: 0
                };
            }
            this._components[i].reset(this._from);
        }
    };
    return PrivIterator;
})();
var PrivIteratorComponent = (function () {
    function PrivIteratorComponent(from, part, idx, visibleIdx, cursor, assertionPolicy) {
        this._beat = null;
        this._nextBeat = null;
        this._part = part;
        this._body = part.body;
        this._sidx = idx;
        this._visibleSidx = visibleIdx;
        this._cursor = cursor;
        this._assertionPolicy = assertionPolicy;
        this.reset(from);
        assert(this._location.eq(from));
    }
    PrivIteratorComponent.prototype.annotate = function (ctx, canExitAtNewline) {
        if (this._beat !== null) {
            ctx.__globalBeat__ = ctx.beat;
            ctx.beat = this._beat;
        }
        ctx.body = this._body;
        ctx.currStave = this._part;
        ctx.currStaveIdx = this._sidx;
        ctx.idx = this._idx;
        var shouldUpdateVC = this._shouldUpdateVC(ctx);
        if (this._aheadOfSchedule(ctx)) {
            return this._addPadding(ctx);
        }
        var status = this._body[this._idx].annotate(ctx);
        this._nextBeat = ctx.beat;
        var isClean = status === 10 /* Success */ && (!this._cursor || this._cursor.annotatedObj);
        var isNewline = this.curr && this.curr.type === 130 /* NewLine */;
        if (status === 10 /* Success */ && shouldUpdateVC) {
            this._cursor.annotatedObj = this.curr;
            this._cursor.annotatedStave = this._visibleSidx;
            this._cursor.annotatedLine = ctx.line;
            this._cursor.annotatedPage = ctx.pageStarts.length - 1;
        }
        if (canExitAtNewline && isNewline && isClean) {
            return 5 /* ExitEarly */;
        }
        return status;
    };
    PrivIteratorComponent.prototype.reset = function (from) {
        this._idx = -1;
        do {
            this._location = new C.Location(this._body[++this._idx].ctxData);
        } while ((from.bar !== 1 || from.beat !== 0) && (this._location.lt(from) || this._location.eq(from) && (!this.curr || this.curr.priority <= 140 /* Begin */ || this.curr.priority === 300 /* Barline */)));
        this._updateSubctx();
    };
    PrivIteratorComponent.prototype.rewind = function (priority) {
        if (!priority) {
            --this._idx;
        }
        else {
            while (this._idx >= 0 && this._body[this._idx].priority !== priority) {
                --this._idx;
            }
        }
        this._updateSubctx();
    };
    PrivIteratorComponent.prototype.rewindSeek = function (loc, priority) {
        while (this._idx >= 0 && (!this._body[this._idx].ctxData || loc.lt(this._body[this._idx].ctxData) || loc.eq(this._body[this._idx].ctxData) && this._body[this._idx].priority > priority)) {
            --this._idx;
        }
        this._updateSubctx();
    };
    PrivIteratorComponent.prototype._updateSubctx = function () {
        if (this.curr && this.curr.ctxData) {
            this._beat = this.curr.ctxData.beat;
            this._nextBeat = null;
        }
        else {
            this._beat = null;
            this._nextBeat = null;
        }
    };
    PrivIteratorComponent.prototype.trySeek = function (priority) {
        this.ensurePriorityIs(priority);
        ++this._idx;
        assert(this.nextPriority === C.MAX_NUM || this.curr);
    };
    PrivIteratorComponent.prototype.ensurePriorityIs = function (priority) {
        if (this._assertionPolicy === 0 /* Strict */) {
            assert.equal(this.nextPriority, priority, "Priorities must be aligned");
        }
        else if (this.nextPriority !== priority) {
            var nextIsPlaceholder = this._body[this._idx + 1] && this._body[this._idx + 1].placeholder;
            var PlaceholderModel = require("./placeholder");
            this._body.splice(this._idx + 1, nextIsPlaceholder ? 1 : 0, new PlaceholderModel({ priority: priority }, true));
        }
    };
    PrivIteratorComponent.prototype.lastOf = function (priority) {
        var i = this._idx;
        while (i > 0 && this._body[i].priority !== priority) {
            --i;
        }
        return new C.Location(this._body[i].ctxData);
    };
    PrivIteratorComponent.prototype.markDone = function () {
        this._idx = this._body.length;
    };
    Object.defineProperty(PrivIteratorComponent.prototype, "nextLocation", {
        get: function () {
            var next = this._next;
            return next ? next.ctxData : MAX_LOCATION;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrivIteratorComponent.prototype, "nextPriority", {
        get: function () {
            var next = this._next;
            return next ? next.priority : C.MAX_NUM;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrivIteratorComponent.prototype, "atEnd", {
        get: function () {
            return !this._body[this._idx];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrivIteratorComponent.prototype, "curr", {
        get: function () {
            return this._body[this._idx];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrivIteratorComponent.prototype, "len", {
        get: function () {
            return this._body.length;
        },
        enumerable: true,
        configurable: true
    });
    PrivIteratorComponent.prototype._aheadOfSchedule = function (ctx) {
        if (ctx.curr.type !== 600 /* Duration */) {
            return false;
        }
        var space = !!(ctx.findVertical(function (c) { return c.type !== 999 /* Placeholder */ && c !== ctx.curr; }).length);
        return space && ctx.curr.type !== 999 /* Placeholder */ && ctx.beat > ctx.__globalBeat__;
    };
    PrivIteratorComponent.prototype._addPadding = function (ctx) {
        var PlaceholderModel = require("./placeholder");
        ctx.splice(ctx.idx, 0, [new PlaceholderModel({
            priority: ctx.curr.priority
        }, true)], 2 /* Additive */);
        ctx.beat = ctx.__globalBeat__;
        return 30 /* RetryCurrentNoOptimizations */;
    };
    Object.defineProperty(PrivIteratorComponent.prototype, "_next", {
        get: function () {
            this._beat = this._nextBeat;
            return this._body[this._idx + 1];
        },
        enumerable: true,
        configurable: true
    });
    PrivIteratorComponent.prototype._shouldUpdateVC = function (ctx) {
        if (!this._cursor) {
            return false;
        }
        if (!ctx.curr) {
            return false;
        }
        var target = this._cursor;
        var barMatches = ctx.bar === target.bar;
        var beatMatches = (!target.beat && !target.annotatedObj) || ctx.beat === target.beat;
        var typeMatches = (ctx.curr.isNote && !target.endMarker) || (target.endMarker && ctx.curr.type === 110 /* EndMarker */);
        return barMatches && beatMatches && typeMatches && !target.annotatedObj;
    };
    return PrivIteratorComponent;
})();
function _cpyline(ctx, line, mode) {
    "use strict";
    if (!!line.accidentalsByStave) {
        ctx.accidentalsByStave = line.accidentalsByStave;
    }
    if (line.bar !== null) {
        ctx.bar = line.bar;
    }
    if (!!line.barlineX !== null) {
        ctx.barlineX = line.barlineX;
    }
    if (!!line.barKeys !== null) {
        ctx.barKeys = line.barKeys;
    }
    if (line.beat !== null) {
        ctx.beat = line.beat;
    }
    if (line.line !== null) {
        ctx.line = line.line;
    }
    if (!!line.pageLines) {
        ctx.pageLines = line.pageLines;
    }
    if (!!line.pageStarts) {
        ctx.pageStarts = line.pageStarts;
    }
    if (line.x !== null) {
        ctx.x = line.x;
    }
    if (line.y !== null) {
        ctx.y = line.y;
    }
}
var NewlineMode;
(function (NewlineMode) {
    NewlineMode[NewlineMode["StartOfLine"] = 0] = "StartOfLine";
    NewlineMode[NewlineMode["MiddleOfLine"] = 1] = "MiddleOfLine";
})(NewlineMode || (NewlineMode = {}));
function _cpysnapshot(ctx, layout) {
    "use strict";
    _.each(layout, function (v, attrib) {
        if (layout[attrib] === null) {
            return;
        }
        switch (attrib) {
            case "lines":
                ctx.lines = layout.lines;
                ctx.line = layout.lines.length - 1;
                _cpyline(ctx, ctx.lines[ctx.line], 0 /* StartOfLine */);
                break;
            case "fontSize":
                ctx.fontSize = layout.fontSize;
                break;
            case "maxX":
                ctx.maxX = layout.maxX;
                break;
            case "maxY":
                ctx.maxY = layout.maxY;
                break;
            case "attributes":
                ctx.attributes = layout.attributes;
                break;
            case "partialLine":
                break;
            case "prevLine":
                break;
            default:
                assert(false, "Not reached");
        }
    });
}
var MAX_LOCATION = new C.Location({
    bar: C.MAX_NUM,
    beat: C.MAX_NUM
});
var MIN_LOCATION = new C.Location({
    bar: -1,
    beat: -1
});
