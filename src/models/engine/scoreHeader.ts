/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file models/engine/scoreHeader.ts holds default header information as well
 * as convienience utilites for score headers.
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");

import IPrint           = require("./iprint");
import renderUtil       = require("./renderUtil");
import smufl            = require("../smufl");
import defaultsDeep     = require("../../util/defaultsDeep");

/** 
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
class ScoreHeader implements MusicXML.ScoreHeader {

    /*---- MusicXML.ScoreHeader -----------------------------------------------------------------*/

    credits:            MusicXML.Credit[]           = [];

    identification:     MusicXML.Identification = {
        creators:                                   [],
        encoding: {
            encodingDescriptions: [],
            encodingDate: null,
            supports: {},
            encoders: [],
            softwares: [],
        },
        miscellaneous:                              null,
        relations:                                  [],
        rights:                                     [],
        source:                                     null
    }

    defaults:           MusicXML.Defaults = {
        appearance: {
            distances: {
                hyphen: {
                    tenths:                         10 * smufl.distances.hyphen,
                    type:                           "hyphen"
                },
                beam: {
                    tenths:                         10 * smufl.distances.beam,
                    type:                           "beam"
                }
            },
            lineWidths: {
                staff: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.staffLineThickness,
                    "type":                         "staff"
                },
                wedge: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.hairpinThickness,
                    "type":                         "wedge"
                },
                ending: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.repeatEndingLineThickness,
                    "type":                         "ending"
                },
                "heavy barline": {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.thickBarlineThickness,
                    "type":                         "heavy barline"
                },
                leger: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.legerLineThickness,
                    "type":                         "leger"
                },
                stem: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.stemThickness,
                    "type":                         "stem"
                },
                "tuplet bracket": {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.tupletBracketThickness,
                    "type":                         "tuplet bracket"
                },
                beam: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.beamThickness,
                    "type":                         "beam"
                },
                "light barline": {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.thinBarlineThickness,
                    "type":                         "light barline"
                },
                enclosure: {
                    "tenths":                       10 * smufl.bravura.engravingDefaults.textEnclosureThickness,
                    "type":                         "enclosure"
                }
            },
            noteSizes: {
                1: { // Grace
                    "type":                         1,
                    "size":                         60 // Not sure what 60 refers to. Our grace notes are 1.9 spaces
                },
                0: { // Cue
                    "type":                         0,
                    "size":                         60 // Not sure what 60 refers to. Our cue notes are 1.9 spaces.
                }
            },
            otherAppearances:                       []
        },
        lyricFonts:                                 [],
        lyricLanguages:                             [],
        musicFont: {
            fontSize:                               "20.5", // This value is completely ignored. See "scaling"
            fontFamily:                             "Bravura, Maestro, engraved",
            fontStyle:                              MusicXML.NormalItalic.Normal,
            fontWeight:                             MusicXML.NormalBold.Normal
        },
        pageLayout: {
            pageHeight:                             renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.pageSizes[0].height),
            pageWidth:                              renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.pageSizes[0].width),
            pageMargins: [
                {
                    bottomMargin:                   renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.bottom),
                    leftMargin:                     renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.left),
                    rightMargin:                    renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.right),
                    topMargin:                      renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.top),
                    type:                           MusicXML.OddEvenBoth.Both
                }
            ]
        },
        scaling: {
            millimeters:                            renderUtil.defaultStaveHeight,
            tenths:                                 40
        },
        staffLayouts:                               [],
        systemLayout: {
            systemDistance:                         131,
            systemDividers:                         null,
            systemMargins: {
                leftMargin:                         0,
                rightMargin:                        0
            },
            topSystemDistance:                      70
        },
        wordFont: {
            fontSize:                               "12",
            fontFamily:                             "Alegreya, Times New Roman, serif",
            fontStyle:                              MusicXML.NormalItalic.Normal,
            fontWeight:                             MusicXML.NormalBold.Normal
        }
    }

    work:               MusicXML.Work = {
        opus:                                       null,
        workNumber:                                 "",
        workTitle:                                  ""
    }

    movementTitle:      string =                    "";
    movementNumber:     string =                    "";

    partList:           MusicXML.PartList = {
        scoreParts:                                 [],
        partGroups:                                 []
    };

    /*---- Extensions ---------------------------------------------------------------------------*/

    constructor(spec: MusicXML.ScoreHeader) {
        if (spec) {
            defaultsDeep(spec, this);
        }
        for(let key in spec) {
            if (spec.hasOwnProperty(key) && typeof key === "string" && !!(<any>spec)[key]) {
                (<any>this)[key] = (<any>spec)[key];
            }
        }
    }

    toXML(): string {
        return "<!-- begin score-header -->\n" +
            MusicXML.serialize.scoreHeader(this) + "\n" +
            "<!-- end score-header -->\n";
    }

    inspect() {
        return this.toXML();
    }

    get composer() {
        return this._getIdentificationOrCredit("composer");
    }

    set composer(composer: string) {
        this._setIdentification("composer", composer);
        this._setCredits("composer", composer, MusicXML.LeftCenterRight.Right, "12px", 20);
    }

    get arranger() {
        return this._getIdentificationOrCredit("arranger");
    }

    set arranger(arranger: string) {
        this._setIdentification("arranger", arranger);
        this._setCredits("arranger", arranger, MusicXML.LeftCenterRight.Right, "12px", 35);
    }

    get lyricist() {
        return this._getIdentificationOrCredit("lyricist");
    }

    set lyricist(lyricist: string) {
        this._setIdentification("lyricist", lyricist);
        this._setCredits("lyricist", lyricist, MusicXML.LeftCenterRight.Right, "12px", 50);
    }

    private _getIdentificationOrCredit(type: string) {
        if (this.identification && (this.identification.creators||[]).length) {
            let idComposer = this.identification.creators
                .filter(c => c.type === type)
                .map(c => c.creator)
                .join(", ");

            if (idComposer) {
                return idComposer;
            }
        }

        return this.credits.filter(c => !!~c.creditTypes.indexOf(type))
            .map(m => m.creditWords)
            .map(w => w.map(w => w.words).join(", "))
            .join(", ");
    }

    private _setIdentification(type: string, val: string) {
        this.identification = this.identification || {
                miscellaneous: [],
                creators: [],
                encoding: [],
                relations: [],
                rights: [],
                source: null
            };
        this.identification.creators = this.identification.creators || [];

        _.forEach(this.identification.creators, c => {
            if (c.type === type) {
                c.creator = val;
            }
        });
        if (!_.any(this.identification.creators, c => c.type === type)) {
            // ...or add a val
            this.identification.creators.push({
                creator: val,
                type: type
            });
        }
    }

    overwriteEncoding() {
        let date = new Date;

        this.identification = this.identification || (new ScoreHeader(null)).identification;
        this.identification.encoding = {
            encodingDescriptions: [],
            encodingDate: {
                month: date.getMonth() + 1,
                day: date.getDay(),
                year: date.getFullYear()
            },
            supports: {
                "satie-ext": {
                    element: "satie-ext",
                    value: null,
                    type: "yes",
                    attribute: null
                }
            },
            encoders: [],
            softwares: [
                "Satie Layout Engine <https://ripieno.github.io/satie> by Josh Netterfield <joshua@nettek.ca>",
                "MusicXML Interfaces <https://ripieno.github.io/musicxml-interfaces>"
            ]
        };
    }

    private _setCredits(type: string, val: string,
            justification: MusicXML.LeftCenterRight, fontSize: string, top: number) {
        const mm = this.defaults.scaling.millimeters;
        const pageLayout = this.defaults.pageLayout;

        this.credits = this.credits || [];
        _.forEach(this.credits, (c, idx) => {
            if (!c.creditWords) {
                return false;
            }
            // Replace a credit...
            let isComposer = !!~c.creditTypes.indexOf(type);
            if (isComposer) {
                if (!c.creditWords.length) {
                    delete this.credits[idx];
                } else {
                    c.creditWords.length = 1;
                    c.creditWords[0].words = val;
                }
            }
        });
        if (!_.any(this.credits, c => !!c.creditWords && !!~c.creditTypes.indexOf(type))) {
            let defaultX = NaN;
            let margins = IPrint.getPageMargins(this.defaults.pageLayout.pageMargins, 1);
            // TODO: Throughout this file, use own instead of default values
            switch (justification) {
                case MusicXML.LeftCenterRight.Center:
                    defaultX = (margins.leftMargin - margins.rightMargin +
                            pageLayout.pageWidth)/2;
                    break;
                case MusicXML.LeftCenterRight.Right:
                    defaultX = pageLayout.pageWidth - margins.rightMargin;
                    break;
                case MusicXML.LeftCenterRight.Left:
                    defaultX = margins.leftMargin;
                    break;
                default:
                    defaultX = margins.leftMargin;
                    break;
            };

            this.credits.push({
                // ... or add a credit
                creditImage: null,
                creditTypes: [type],
                creditWords: [{
                    words: val,
                    defaultX: defaultX,
                    justify: justification,
                    defaultY: pageLayout.pageHeight - renderUtil.mmToTenths(mm, top),
                    fontSize: fontSize
                }],
                page: 1
            });
        }
    }

    get title() {
        return this.movementTitle;
    }
    set title(title: string) {
        // Set meta-data
        this.movementTitle = title;

        this._setCredits("title", title, MusicXML.LeftCenterRight.Center, "18px", 10);
    }
}

export = ScoreHeader;
