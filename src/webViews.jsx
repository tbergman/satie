/**
 * Sets the React renderer as the active view for all
 * Models.
 */

require("./stores/models/barline.jsx").setView(
    require("./views/barline.jsx"));

require("./stores/models/begin.jsx").setView(
    require("./views/begin.jsx"));

require("./stores/models/beamGroup.jsx").setView(
    require("./views/beamGroup.jsx"));

require("./stores/models/clef.jsx").setView(
    require("./views/clef.jsx"));

require("./stores/models/duration.jsx").setView(
    require("./views/duration.jsx"));

require("./stores/models/keySignature.jsx").setView(
    require("./views/keySignature.jsx"));

require("./stores/models/newline.jsx").setView(
    require("./views/newline.jsx"));

require("./stores/models/slur.jsx").setView(
    require("./views/slur.jsx"));

require("./stores/models/timeSignature.jsx").setView(
    require("./views/timeSignature.jsx"));
