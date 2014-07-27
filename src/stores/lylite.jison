%{
    var _ = require("lodash");
    var util = require("ripienoUtil/renderUtil.jsx");

    var BarlineModel = require("./barline.jsx");
    var ClefModel = require("./clef.jsx");
    var EndMarkerModel = require("./endMarker.jsx");
    var KeySignatureModel = require("./keySignature.jsx");
    var DurationModel = require("./duration.jsx");
    var NewlineModel = require("./newline.jsx");
    var NewPageModel = require("./newpage.jsx");
    var TimeSignatureModel = require("./timeSignature.jsx");
%}

%options flex

%lex
%%


\s+                   /* NONE */
[0-9]+\.[0-9]+       return 'NUMBER'
[0-9]+                return 'NUMBER'

"<"                   return 'LT'
">"                   return 'GT'

"="                   return 'EQ'
"/"                   return 'SLASH'

"\key"                return 'SET_KEY'
"\major"              return 'KEY_MODE'
"\minor"              return 'KEY_MODE'

"\header"             return 'SET_HEADER'

"\new"                return 'NEW'
"Staff"               return 'NEW_STAFF'
"PianoStaff"          return 'NEW_PIANO_STAFF'

"\("                  return 'PH_SLUR_OPEN'
"\)"                  return 'PH_SLUR_CLOSE'
"("                   return 'SLUR_OPEN'
")"                   return 'SLUR_CLOSE'
"["                   return 'BEAM_OPEN'
"]"                   return 'BEAM_CLOSE'
"|"                   return 'BAR_HINT'
"~"                   return 'TIE'
"#"                   return 'POUND'

"-^"                  return 'articMarcato'
"-+"                  return 'pluckedLeftHandPizzicato'
"--"                  return 'articTenuto'
"-|"                  return 'articStaccatissimo'
"->"                  return 'articAccent'
"-."                  return 'articStaccato'
"-_"                  return 'articStaccatoSlur'

"\times"              return 'TUPLET'

"\accent"             return 'ARTIC'
"\espressivo"         return 'ARTIC'
"\marcato"            return 'ARTIC'
"\portato"            return 'ARTIC'
"\staccatissimo"      return 'ARTIC'
"\staccato"           return 'ARTIC'
"\tenuto"             return 'ARTIC'

"\prall"              return 'ARTIC'
"\mordent"            return 'ARTIC'
"\prallmordent"       return 'ARTIC'
"\turn"               return 'ARTIC'
"\uprall"             return 'ARTIC'
"\downprall"          return 'ARTIC'
"\upmordent"          return 'ARTIC'
"\downmordent"        return 'ARTIC'
"\lineprall"          return 'ARTIC'
"\prallprall"         return 'ARTIC'
"\pralldown"          return 'ARTIC'
"\prallup"            return 'ARTIC'
"\reverseturn"        return 'ARTIC'
"\trill"              return 'ARTIC'

"\shortfermata"       return 'ARTIC'
"\fermata"            return 'ARTIC'
"\longfermata"        return 'ARTIC'
"\verylongfermata"    return 'ARTIC'

"\upbow"              return 'ARTIC'
"\downbow"            return 'ARTIC'
"\flageolet"          return 'ARTIC'
"\thumb"              return 'ARTIC'
"\snappizicato"       return 'ARTIC'
"\open"               return 'ARTIC'
"\halfopen"           return 'ARTIC'
"\stopped"            return 'ARTIC'
"\lheel"              return 'ARTIC'
"\rheel"              return 'ARTIC'
"\ltoe"               return 'ARTIC'
"\rtoe"               return 'ARTIC'

"\segno"              return 'ARTIC'
"\coda"               return 'ARTIC'
"\varcoda"            return 'ARTIC'

"\ictus"              return 'ARTIC'
"\accentus"           return 'ARTIC'
"\circulus"           return 'ARTIC'
"\semicirculus"       return 'ARTIC'
"\signumcongruentiae" return 'ARTIC'

"\pageBreak"          return 'PAGE_BREAK'

"."+                  return 'DOTS'

"{"                   return 'LBRACE'
"}"                   return 'RBRACE'

"\clef"               return 'SET_CLEF'
"z_RIPIENO_HACK_INVISIBLE\clef"           return 'SET_CLEF'
"alto"                return 'CLEF'
"tenor"               return 'CLEF'
"bass"                return 'CLEF'
"treble"              return 'CLEF'
"soprano"             return 'CLEF'
"mezzosoprano"        return 'CLEF'
"baritone"            return 'CLEF'
"french"              return 'CLEF'

"%{["                 return 'RIPIENO_EXT_OPEN'
"]}%"                 return 'RIPIENO_EXT_CLOSE'

"\time"               return 'SET_TIME'

"\relative"           return 'RELATIVE'

"set-global-staff-size" return 'SET_STAFF_SIZE'
"set-default-paper-size" return 'SET_PAPER_SIZE'

[a-zA-Z\u266d]+             return 'STRING'
\"(?:[^"\\]|\\.)*\"   return 'STRING'

"'"                   return 'SINGLE_QUOTE'
'"'                   return 'DOUBLE_QUOTE'
","                   return 'COMMA'

<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

%{
    var assert = require("assert");

    var inOctave = {
        c: 0,
        d: 1,
        e: 2,
        f: 3,
        g: 4,
        a: 5,
        b: 6
    };
    function noteToPositionInOctave(note) {
        return inOctave[note.pitch];
    }
    function makeRelativeInPlace(prev, curr) {
        if (curr.relative) {
            // When \relative blocks are nested, the innermost \relative block applies. 
            return curr;
        }
        var prevP = noteToPositionInOctave(prev);
        var prevO = prev.octave || 0;
        var currP = noteToPositionInOctave(curr);

        var alternatives = [
            [prevO + 1, currP + 7 - prevP],
            [prevO, currP - prevP],
            [prevO - 1, currP - 7 - prevP]
        ];

        var octave = _.min(alternatives, function(m) { return Math.abs(m[1]); })[0];

        curr.octave = (curr.octave || 0) + octave;
        curr.relative = true;

        return curr;
    }

    function assertPitch(letter) {
        assert("abcdefghr".indexOf(letter) !== -1,
            "Parsed a pitch with starting letter " + letter +
            " but expected a letter between a and h");
    }
    function parseAccidental(acc) {
        switch(acc) {
            case "eses":        // dflat
            case "bb":
            case "ff":
            case "flatflat":
            case "essess":
                return -2;
            case "es":          // flat
            case "b":
            case "flat":
            case "ess":
                return -1;
            case "is":          // sharp
            case "d":
            case "s":
            case "sharp":
            case "iss":
            case "k":
                return 1;
            case "isis":        // dsharp
            case "dd":
            case "ss":
            case "x":
            case "sharpsharp":
            case "ississ":
            case "kk":
                return 2;
        }
        assert(0, "Expected an accidental, but read ", acc);
    }
    function parsePitch(pitch) {
        assert(pitch.length, "Pitch is empty, but expected a lilypond-style pitch");
        assertPitch(pitch[0]);
        if (pitch[0] === 'h') {
            pitch[0] = 'b';
        }
        if (pitch[0] === 'r') {
            pitch[0] = "REST";
        }
        var ret = {
            pitch: pitch[0]
        };
        if (pitch.length > 1) {
            ret.acc = parseAccidental(pitch.substring(1));
        }
        return ret;
    }
%}

%left 'SINGLE_QUOTE' 'COMMA'
%start root
%%

root
  : parts EOF                          { return $1; }
  ;

parts
  : /*empty*/                          { $$ = []; }
  | parts globalExpr                   { $$ = $1.concat($2); }
  | parts header                       { $$ = $1.concat({header: $2}); }
  | parts musicExpr                    { $$ = $1.concat({body: $2}); }
  | parts 'NEW' 'NEW_STAFF' musicExpr  { $$ = $1.concat({body: $4}); }
  | parts 'NEW' 'NEW_PIANO_STAFF' pianoStaff
        {
            $$ = $1.concat($4);
        }
  | parts newStaffExpr                 { $$ = $1.concat($2); }
  ;

globalExpr
  : 'POUND' 'SLUR_OPEN' 'SET_STAFF_SIZE' 'NUMBER' 'SLUR_CLOSE'
        {
            $$ = {staveHeight: parseFloat($4)/util.ptPerMM};
        }
  | 'POUND' 'SLUR_OPEN' 'SET_PAPER_SIZE' 'STRING' 'SLUR_CLOSE'
        {
            if ($4.length && $4[0] === '"') {
                $4 = $4.substring(1);
            }
            if ($4.length && $4[$4.length - 1] === '"') {
                $4 = $4.substring(0, $4.length - 1);
            }

            $$ = {pageSize: _.clone(util.lilypondSizes[$4])};
            if ($$.pageSize && $$.pageSize.unit == "in") {
                $$.pageSize.width = $$.pageSize.width * util.mmPerIn;
                $$.pageSize.height = $$.pageSize.height * util.mmPerIn;
                $$.pageSize.unit = "mm";
            }
            $$.pageSize.lilypondName = $4;
        }
  ;

anyQuote
  : 'SINGLE_QUOTE'                      {}
  | 'DOUBLE_QUOTE'                      {}
  ;

pianoStaff
  : LT LT parts GT GT
        {
            $$ = $3;
            _.each($$, function(s, idx) {
                if (idx + 1 !== $$.length) {
                    s.pianoStaff = true;
                }
            }.bind(this));
        }
  ;

header
  : 'SET_HEADER' 'LBRACE' headerElements 'RBRACE' { $$ = $3; }
  ;

headerElements
  : /* empty */                        { $$ = {}; }
  | headerElements headerElement
        {
            $$ = _.extend($1, $2);
        }
  ;

headerElement
  : 'STRING' 'EQ' 'STRING'          
        {
            if ($3.length && $3[0] === '"') {
                $3 = $3.substring(1);
            }
            if ($3.length && $3[$3.length - 1] === '"') {
                $3 = $3.substring(0, $3.length - 1);
            }
            $$ = {};
            $$[$1] = $3;
        }
  ;

musicExpr
  : 'LBRACE' partElements 'RBRACE'
        {
            $2.push(new EndMarkerModel({endMarker: true}));
            $$ = $2;
        }
  | relativeMode
  ;

partElements
  : /*empty*/                          { $$ = []; }
  | partElements partElement        
        {
            if (!$2) {
                $$ = $1;
                return;
            }
            if ($2.appendSlur) {
                var x = $1[$1.length - 1];
                --$1.length;
                $2.appendSlur.splice(1, 0, x);
            } 

            $$ = $1.concat($2.appendSlur || $2.append || [$2]);
        }
  ;

partElement
  : 'SET_CLEF' 'clef'
        { 
            $$ = new ClefModel({clef: $2});
            if ($1 === "z_RIPIENO_HACK_INVISIBLE\\clef") {
                $$.isVisible = false;
            }
        }
  | 'SET_CLEF' 'STRING'
        {
            if ($1 === "G") {
                $$ = {clef: "treble"};
            } else if ($1 === "F") {
                $$ = {clef: "bass"};
            } else if ($1 === "C") {
                $$ = {clef: "alto"};
            }
        }
  | 'SET_TIME' 'NUMBER' 'SLASH' 'NUMBER'
        {
            assert(parseInt($2, 0), "Numerator must be non-null");
            assert(parseInt($4, 0), "Denominator must be non-null");
            $$ = new TimeSignatureModel({timeSignature: {beats: $2, beatType: $4} });
        }
  | relativeMode                         { $$ = $1; }
  | completePitchOrChord                 { $$ = new DurationModel($1); }
  | tupletMode                           { $$ = $1; }
  | 'PAGE_BREAK'                         { $$ = {append: [
        new BarlineModel({barline: true}),
        new NewPageModel({newpage: true}),
        new NewlineModel({newline: true})]}; }
  | 'SLUR_OPEN' partElements 'SLUR_CLOSE'
        {
            $$ = {appendSlur: [{slur: $2.length + 1}].concat($2)}
        }
  | 'SET_KEY' 'STRING' 'KEY_MODE'
        {
            $$ = new KeySignatureModel({keySignature: {pitch: parsePitch($2), mode: $3}});
        }
  | 'BEAM_OPEN'
        {
            // TODO
            $$ = undefined;
        }
  | 'BEAM_CLOSE'
        {
            // TODO
            $$ = undefined;
        }
  | 'BAR_HINT'
        {
            // TODO
            $$ = undefined;
        }
  ;

completePitchOrChord 
  : pitchOrChord                             { $$ = $1; }
  | pitchOrChord beatType                    { $$ = _.extend($1, $2); }
  | pitchOrChord beatType dots               { $$ = _.extend($1, $2, $3); }
  | pitchOrChord beatType dots accents       { $$ = _.extend($1, $2, $3, $4); }
  | pitchOrChord beatType accents            { $$ = _.extend($1, $2, $3); }
  | pitchOrChord dots                        { $$ = _.extend($1, $2); }
  | pitchOrChord dots accents                { $$ = _.extend($1, $2, $3); }
  | pitchOrChord accents                     { $$ = _.extend($1, $2); }
  | pitchOrChord tie                         { $$ = _.extend($1, $2); }
  | pitchOrChord beatType tie                { $$ = _.extend($1, $2, $3); }
  | pitchOrChord beatType dots tie           { $$ = _.extend($1, $2, $3, $4); }
  | pitchOrChord beatType dots accents tie   { $$ = _.extend($1, $2, $3, $4, $5); }
  | pitchOrChord beatType accents tie        { $$ = _.extend($1, $2, $3, $4); }
  | pitchOrChord dots tie                    { $$ = _.extend($1, $2, $3); }
  | pitchOrChord dots accents tie            { $$ = _.extend($1, $2, $3, $4); }
  | pitchOrChord accents tie                 { $$ = _.extend($1, $2, $3); }
  ;

pitchOrChord
  : pitchMaybeWithOctave                     { $$ = $1; }
  | chord                                    { $$ = $1; }
  ;

beatType
  : NUMBER
        {
            assert(parseInt($1, 10), "beatType must be non-null");
            $$ = {count: $1};
        }
  ;

tie
  : 'TIE'                                    { $$ = {tie: true}; }
  ;

pitchMaybeWithOctave
  : 'STRING' octaveOpts                      { $$ = _.extend(parsePitch($1), $2); }
  | 'STRING'                                 { $$ = parsePitch($1); }
  ;

chord
  : 'LT' chordPitches 'GT'                   { $$ = {chord: $2}; }
  ;

chordPitches
  : /*empty*/                                { $$ = []; }
  | chordPitches pitchMaybeWithOctave        { $$ = $1.concat($2); }
  | chordPitches pitchMaybeWithOctave accent { $$ = $1.concat($2.extend($3)); }
  ;

tupletMode
  : 'TUPLET' NUMBER 'SLASH' NUMBER musicExpr
        {
            var tuplet = {
                num: $2,
                den: $4
            };
            _.each($5, function(n) {
                if (n.pitch || n.chord) {
                    n.tuplet = tuplet;
                }
            });

            $$ = {append: $5};
        }
  ;

relativeMode
  : 'RELATIVE' pitchMaybeWithOctave musicExpr
        { 
            var chain = $3;
            _.reduce(chain, function(prev, curr) {
                if (curr.pitch) {
                    makeRelativeInPlace(prev, curr);
                    return curr;
                } else if (curr.chord && curr.chord.length) {
                    _.reduce(curr.chord, function(prev, curr) {
                        makeRelativeInPlace(prev, curr);
                        return curr;
                    }, prev);
                    return curr.chord[0];
                }
                return prev;
            }, $2);
            $$ = {append: chain};
        }
  ;

clef
  : 'CLEF'    { $$ = $1; }
  ;

octaveOpts
  : octaveOpt                 { $$ = $1; }
  | octaveOpts octaveOpt      { $2.octave += ($1.octave || 0); $$ = _.extend($1, $2); }
  ;

octaveOpt
  : octaveChange
        {
            var o = $$.octave || 0;
            if (o) {
                assert(Math.sign(o) === Math.sign($1), "Please only specify either up octaves or down octaves");
            }
            $$ = {octave: (o || 0) + $1};
        }
  ;

dots
  : 'DOTS'                    { $$ = {dots: $1.length}; }
  ;

accents
  : accentx                     { $$ = {accents: [$1]}; }
  | 'articStaccatoSlur'         { $$ = {accents: ['articStaccato'], slur: true}; }
  | accents accentx             { $$ = {accents: $1.accents.concat([$2])}; }
  | accents 'articStaccatoSlur' { $$ = {accents: $1.accents.concat(['articStaccato']), slur: true}; }
  ;

accentx
  : 'articMarcato'              { $$ = 'articMarcato' }
  | 'pluckedLeftHandPizzicato'  { $$ = 'pluckedLeftHandPizzicato' }
  | 'articTenuto'               { $$ = 'articTenuto' }
  | 'articStaccatissimo'        { $$ = 'articStaccatissimo' }
  | 'articAccent'               { $$ = 'articAccent' }
  | 'articStaccato'             { $$ = 'articStaccato' }
  | 'ARTIC'                     { $$ = $1.substring(1); }
  ;

octaveChange
  : 'SINGLE_QUOTE'            { $$ = 1; }
  | 'COMMA'                   { $$ = -1; }
  ;