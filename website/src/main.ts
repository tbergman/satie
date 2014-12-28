/** 
 * Copyright (C) 2015 Josh Netterfield
 * Part of the ripieno-musicxml project, a MusicXML to SVG converter.
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

/// <reference path="../typings/tsd.d.ts" />

/* tslint:disable */

import Page         = require("./page");

import React        = require("react");

(function main() {
    "use strict";
    React.render(
        <!Page.Component />,
        document.body);
}());
