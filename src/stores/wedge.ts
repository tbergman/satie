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

import Model        = require("./model");

import Annotator    = require("./annotator");
import C            = require("./contracts");
import assert       = require("assert");

/**
 * Model for things such as crescendos and diminuendos.
 */
class WedgeModel extends Model /* implements C.MusicXML.Wedge */ {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()                      { return C.Type.Wedge; }
    get xPolicy()                   { return C.RectifyXPolicy.Min; }
    get fields(): string[]          { return ["wedgeType"]; }

    /*---- I.2 WedgeModel -----------------------------------------------------------------------*/

    wedgeType: C.MusicXML.WedgeType;
    endpoint: WedgeModel;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Wedges are paired.
        if (this.wedgeType === C.MusicXML.WedgeType.Stop) {
            var endpoint            = ctx.prev(m => m.type === C.Type.Wedge, 1);
            assert.equal(endpoint.type, C.Type.Wedge);
            assert.notEqual((<WedgeModel>endpoint).wedgeType, C.MusicXML.WedgeType.Stop);
            this.endpoint           = <WedgeModel> endpoint;
            this.endpoint.endpoint  = this;
        }

        // Wedges have no logical width.
        return C.IterationStatus.Success;
    }

}

export = WedgeModel;