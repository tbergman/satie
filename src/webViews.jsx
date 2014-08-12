/**
 * Sets the React renderer as the active view for all
 * Models.
 */

require("./stores/barline.ts").setView(
    require("./views/barline.jsx"));

require("./stores/begin.ts").setView(
    require("./views/begin.jsx"));

require("./stores/beamGroup.ts").setView(
    require("./views/beamGroup.jsx"));

require("./stores/clef.ts").setView(
    require("./views/clef.jsx"));

require("./stores/duration.ts").setView(
    require("./views/duration.jsx"));

require("./stores/keySignature.ts").setView(
    require("./views/keySignature.jsx"));

require("./stores/newline.ts").setView(
    require("./views/newline.jsx"));

require("./stores/slur.ts").setView(
    require("./views/slur.jsx"));

require("./stores/timeSignature.ts").setView(
    require("./views/timeSignature.jsx"));
