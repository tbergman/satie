# MusicXML Compliance Status
Satie uses [http://lilypond.org/doc/v2.18/input/regression/musicxml/collated-files](the unofficial MusicXML test suite) to verify MusicXML compliance, and to avoid regressions.

TODO: Attach screenshots.
TODO: Automate regression testing.

## Legend
 | Meaning
:-:|:--
✓ | Passes
≈ | Minor issues
✗ | Major Issues
☢ | Error
 | Not tested

## 01. Pitches
|   |                                     |   | Screenshot and Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
01a | Pitches and accidentals             | ✓ | ![](tests/baselines/01a.png) Lilypond incorrectly puts parentheses around cautionary accidentals instead of editorial accidentals
01b | Intervals                           | ✓ | ![](tests/baselines/01b.png) Includes automatic cautionaries because an accidental is not specified.
01c | No Voice Element                    | ✓ | ![](tests/baselines/01c.png)
01d | Microtones                          | ✓ | ![](tests/baselines/01d.png) Not reflected in playback
01e | Parenthesized Accidentals           | ✓ | ![](tests/baselines/01e.png) Lilypond incorrectly puts parentheses around cautionary accidentals instead of editorial accidentals
01f | Parenthesized Microtone Accidentals | ✓ | ![](tests/baselines/01f.png) Ditto.


## 02. Rests
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
02a | Rest unit test                      | ✓ | ![](tests/baselines/02a.png) Uses modern multi-measure rests.
02b | Pitched Rests                       | ✓ | ![](tests/baselines/02b.png) Differences appear because Bravura rests are slightly shorter.
02c | Multi Measure Rests                 | ✓ | ![](tests/baselines/02c.png) Uses modern multi-measure rests.
02d | Multi Measure Rests + TS            | ✓ | ![](tests/baselines/02d.png) Uses modern multi-measure rests.
02e | No Type                             | ✗ | ![](tests/baselines/02e.png) Engraved property ignored, grand-staff barlines not working, and there needs to be another voice for stave 2, bar 2

## 03. Rhythm
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
03a | Durations                           | ✓ | ![](tests/baselines/03a.png) 
03b | Backup                              | ✗ | ![](tests/baselines/03b.png) Engraved property ignored, and voice 2, implicit beats should be hidden, stem directions should be set by voice.
03c | Division Change                     | ✓ | ![](tests/baselines/03c.png)
03d | Dotted Duration Factors             | ✓ | ![](tests/baselines/03d.png) Lilypond uses a traditional rest for bar 16.

## 11. Time Signatures
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
11a | Time Signatures                     | ✓ | ![](tests/baselines/11a.png) 
11b | No Time                             | ≈ | ![](tests/baselines/11b.png) Barlines should be grand-staff barlines
11c | Compound Simple                     | ✗ | ![](tests/baselines/11c.png) Beaming, spell out compound TS
11d | Compound Multiple                   | ✗ | ![](tests/baselines/11d.png) Beaming, spell out compound TS, long note should not have stem
11e | Compound Mixed                      | ✗ | ![](tests/baselines/11e.png) Beaming, spell out compound TS
11f | Symbol Meaning                      | ✓ | ![](tests/baselines/11f.png) Symbol should take precedence over TS, as in Finale
11g | Single Number                       | ✗ | ![](tests/baselines/11g.png) Single number, beaming
11h | Senza Misura                        | ☢ | ![](tests/baselines/11h.png) 

## 12. Clefs
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
12a | Clefs                               | ✗ | ![](tests/baselines/12a.png) Octave shifts not rendered, tab on wrong line
12b | No Key or Clef                      | ✓ | ![](tests/baselines/12b.png)

## 13. Key Signatures
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
13a | Key Signatures                      | ≈ | ![](tests/baselines/13a.png) Extra spacing should be given to double flats/sharps
13b | Church Modes                        | ✓ | ![](tests/baselines/13b.png) Not sure what this tests
13c | Non Traditional                     | ✗ | ![](tests/baselines/13c.png) Not rendered or acknowledged
13d | Microtones                          | ✗ | ![](tests/baselines/13d.png) Not rendered or acknowledged

## 14. Staff attributes
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
14a | Line Changes                        | ✗ | ![](tests/baselines/14a.png) No line changes, no brace, no vertical seperation

## 21. Chords
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
21a | Basic                               | ✓ | ![](tests/baselines/21a.png) 
21b | Two Notes                           | ✓ | ![](tests/baselines/21b.png) 
21c | Three Notes Duration                | ✓ | ![](tests/baselines/21c.png) 
21d | Schubert, Stabat, Mater             | ✗ | ![](tests/baselines/21d.png) Ornaments and directions ignored
21e | Pickup Measures                     | ✓ | ![](tests/baselines/21e.png) Nit: Pickup measures should not be given additional space.
21f | Elements in Between                 | ✗ | ![](tests/baselines/21f.png) Elements not rendered

## 22. Note settings, heads, etc.
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
22a | Noteheads                           | ✗ | ![](tests/baselines/22a.png) Noteheads ignored
22b | Note styles                         | ✗ | ![](tests/baselines/22b.png) Note styles ignored. Lilypond ignores note styles.
22c | Noteheads chords                    | ✗ | ![](tests/baselines/22c.png) Noteheads ignored, overlapping text
22d | Parenthesized Noteheads             | ✗ | ![](tests/baselines/22d.png) Ignored

## 23. Tuplets
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
23a | Tuplets                             | ✓ | ![](tests/baselines/23a.png) Closing brace should fully cover start/end
23b | Styles                              | ✗ | ![](tests/baselines/23b.png) Nope.
23c | Non Standard                        | ✗ | ![](tests/baselines/23c.png) Nope.
23d | Nested                              | ✗ | ![](tests/baselines/23d.png) Flipped brace, no beams
23e | Tremelo                             | ☢ | ![](tests/baselines/23e.png) Unterminated beam!!!
23f | Duration without bracker            | ☢ | ![](tests/baselines/23f.png) [object Object]

## 24. Grace Notes
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
24a | Grace Notes                         | ✗ | ![](tests/baselines/24a.png) Missing beams
24b | Chords as grace notes               | ✗ | ![](tests/baselines/24b.png) Missing slashes
24c | Measure End                         | ✗ | ![](tests/baselines/24c.png) Missing beams
24d | After Grace                         | ✗ | ![](tests/baselines/24d.png) Missing beams
24e | Nested                              | ✗ | ![](tests/baselines/24e.png) Flipped brace, no beams
24f | Staff Change                        | ✗ | ![](tests/baselines/24f.png) Missing beam, bad metre completion which should be invisible anyway, missing voice in bottom staff.
24g | Slur                                | ✗ | ![](tests/baselines/24g.png) No slur

## 31. Directions  
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
31a | Directions                          | ✗ | ![](tests/baselines/31a.png) No directions
31c | Metronome Marks                     | ✗ | ![](tests/baselines/31c.png) No metronome marks

## 32. Notations and Articulations
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
32a | Notations                           | ✗ | ![](tests/baselines/32a.png) No notations
32b | Articulations Texts                 | ✗ | ![](tests/baselines/32b.png) No articulation texts
32c | Multiple Notation Children          | ✗ | ![](tests/baselines/32c.png) Natural (bug in test). No notations.
32d | Arpeggio                            | ✗ | ![](tests/baselines/32d.png) No arpeggios

## 33. Spanners
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
33a | Spanners                            | ✗ | ![](tests/baselines/33a.png) Renders garbage!
33b | Tie                                 | ✓ | ![](tests/baselines/33b.png) 
33c | Slurs                               | ✗ | ![](tests/baselines/33c.png) Oh boy.
33d | Octave shifts                       | ✗ | ![](tests/baselines/33d.png) Beams, visual, rendered octave
33e | Octave shifts, Invalid Size         | ✓ | ![](tests/baselines/33e.png) Because we ignore all octave shifts
33f | Trill ending on grace note          | ✗ | ![](tests/baselines/33f.png) Missing beam, missing trill
33g | Chorded notes and slurs             | ✗ | ![](tests/baselines/33g.png) No slur
33h | Glissando                           | ✗ | ![](tests/baselines/33h.png) No glissando
33i | Ties, not ended                     | ✗ | ![](tests/baselines/33i.png) C should be connected to D

## 41. Multiple Parts
✗ No vertical seperation. Several crash.

## 42. Multi voice
☢ All tests crash.

## 43. Multi staff
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
43a | Piano staff                         | ✗ | ![](tests/baselines/43a.png) Missing grand staff barlines, should be single bar
43b | Different Keys                      | ✗ | ![](tests/baselines/43b.png) D major key on wrong bar, should be single bar
43c | Different Keys after Backup         | ✗ | ![](tests/baselines/43c.png) Renders garbage
43d | Staff change                        | ✗ | ![](tests/baselines/43d.png) Beams, hide implicit rests, missing rests in staff 2, vertical seperation to large.
43e | Clef Dynamics                       | ✗ | ![](tests/baselines/43e.png) Beams, visual, rendered octave

## 45. Repeats
✗ No Repeats.

## 46. Barline and Measures
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
46a | Barlines                            | ✗ | ![](tests/baselines/46a.png) Fancy barlines appear as normal
46b | Midmeasure Barlines                 | ✓ | ![](tests/baselines/46b.png) Lilypond output is wrong.
46c | Midmeasure Clefs                    | ✗ | ![](tests/baselines/46c.png) One barline should be hidden
46d | Implicit Measures                   | ✗ | ![](tests/baselines/46d.png) Very much explicit.
46e | Late Second Voice                   | ✗ | ![](tests/baselines/46e.png) Implicit rests rendered, both voices have same stem direction
46f | Incomplete Measures                 | ✓ | ![](tests/baselines/46f.png) Not reflected in playback
46g | Figured Bass                        | ☢ | ![](tests/baselines/46g.png) Cannot read property 'length' of null.

## 51. Header Information
☢ All tests error.

## 52. Page layout
☢ All tests error.

## 61. Lyrics
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
61a | Lyrics                              | ≈ | ![](tests/baselines/61a.png) Missing syllable spanners.
61b | Multiple lyrics                     | ✗ | ![](tests/baselines/61b.png) Lyrics rendered on top of each other.
61c | Midmeasure Clefs                    | ≈ | ![](tests/baselines/61c.png) Except for syllable spanners, as above.
61d | Melisma                             | ✗ | ![](tests/baselines/61d.png) Melisma, ties, slurs
61e | Lyrics on Chords                    | ✓ | ![](tests/baselines/61e.png) 
61f | Lyrics on Notes with Graces         | ✓ | ![](tests/baselines/61f.png) 
61g | Lyrics with names and numbers       | ✗ | ![](tests/baselines/61g.png) No defined answer. Overlapping lyrics.
61h | Beams with Melismatas               | ✗ | ![](tests/baselines/61h.png) No beams. No melismatas.
61i | Multiple lyrics on chords           | ✗ | ![](tests/baselines/61i.png) Check Finale.
61j | Elisions                            | ✗ | ![](tests/baselines/61j.png) Overlapping, no elisions
61k | Spanners and extenders              | ✗ | ![](tests/baselines/61k.png) No spanners or extenders

## 71. Guitar notation
☢ All tests error.

## 72. Transposing instruments
|   |                                     |   | Notes
----|-------------------------------------|:-:|----------------------------------------------------------------
72a | Transposing Instruments             | ✗ | ![](tests/baselines/72a.png) Overlapping, no transposition
72b | Full                                | ✗ | ![](tests/baselines/72b.png) Overlapping, no transposition
72c | Change                              | ☢ | ![](tests/baselines/72c.png) Cannot read property 'length' of null.

## 73. Guitar notation
☢ Cannot read property 'length' of null.

## 74. Figured bass
☢ Cannot read property 'length' of null.

## 75. Other instrumental notation
✗ No accordion registrations.

## 90. Compressed MusicXML files
☢ Cannot read property 'length' of null.

## 99b. Sibelius 5 errata
✗ No beams.
