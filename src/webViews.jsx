/**
 * Sets the React renderer as the active view for all
 * Models.
 */

require("./stores/barline.jsx").setView(
    require("./views/barline.jsx"));

require("./stores/begin.jsx").setView(
    require("./views/begin.jsx"));

require("./stores/beamGroup.jsx").setView(
    require("./views/beamGroup.jsx"));

require("./stores/clef.jsx").setView(
    require("./views/clef.jsx"));

require("./stores/duration.jsx").setView(
    require("./views/duration.jsx"));

require("./stores/keySignature.jsx").setView(
    require("./views/keySignature.jsx"));

require("./stores/newline.jsx").setView(
    require("./views/newline.jsx"));

require("./stores/slur.jsx").setView(
    require("./views/slur.jsx"));

require("./stores/timeSignature.jsx").setView(
    require("./views/timeSignature.jsx"));
