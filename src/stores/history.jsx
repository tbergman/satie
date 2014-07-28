/**
 * Undo/redo functionality. To enable it, simply require("history.jsx").
 *
 * Currently this is extremely naive -- it renders the source after every
 * action, and replaces the source as need be. As Ripieno becomes more
 * sophisticated, better history functionality will be required.
 */

var SongEditorStore = require("./songEditor.jsx");

class History {
    undo() {
        if (!this._history.length) {
            return;
        }
        this._redoHistory.push(SongEditorStore.src());
        "/local/song/_replaceSrc".PUT(this._history.pop());
    }
    redo() {
        if (!this._redoHistory.length) {
            return;
        }
        this._history.push(SongEditorStore.src());
        "/local/song/_replaceSrc".PUT(this._redoHistory.pop());
    }

    constructor() {
        this._addHistory = this._addHistory.bind(this);
        this._clearHistory = this._clearHistory.bind(this);
        this._history = [];
        this._redoHistory = [];

        SongEditorStore.addHistoryListener(this._addHistory);
        SongEditorStore.addClearHistoryListener(this._clearHistory);
    }
    destroy() {
        SongEditorStore.removeHistoryListener(this._addHistory);
        SongEditorStore.removeHistoryListener(this._clearHistory);
    }

    // private
    _addHistory() {
        console.time("Add history");
        this._history.push(SongEditorStore.src());
        this._redoHistory = [];
        console.timeEnd("Add history");
    }
    _clearHistory() {
        this._history = [];
        this._redoHistory = [];
    }
}

module.exports = global.History = new History();
