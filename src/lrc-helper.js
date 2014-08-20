/**
 * The Ripieno client library C API implementation. JS helper.
 *
 * Copyright (C) Josh Netterfield 2014. All rights reserved.
 */

/*jshint undef:false*/

if (!Object.freeze) { // Old JSC on Win32
    Object.freeze = function () { return this; };
}
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }
 
    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
            try {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
            } catch(e) {
                //catching what javascriptcore considers an illegal use of instanceof
                return fToBind.apply(oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
            }
        };
 
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
 
    return fBound;
  };
}

var ReactComponent = require("react/lib/ReactComponent");
var ReactEventEmitter = require("react/lib/ReactEventEmitter");
var RiactUpdateTransaction = require("./riactUpdateTransaction.js");
var _ = require("lodash");
var assert = require("assert");
var instantiateReactComponent = require("react/lib/instantiateReactComponent");


/********************
 * 0. DUCK PUNCHING *
 ********************/

console.log("Help! I'm trapped in a C library.");

var pending = [];
_.defer = function (fn) {
    pending.push(fn);
};
var resolvePending = function () {
    while (pending.length) {
        pending[0]();
        pending.splice(0, 1);
    }
};


/*************************
 * 1. GLOBAL ENVIRONMENT *
 *************************/

libripienoclient = {};
Riact = { // RIpieno reACT
    updateComponent: function (nextComponent, newProps) {
        nextComponent._pendingProps = newProps || nextComponent.props;

        var transaction = RiactUpdateTransaction.getPooled();
        transaction.perform(
                Riact._performUpdateIfNecessary,
                nextComponent,
                transaction
                );
        RiactUpdateTransaction.release(transaction);
        resolvePending();

        return nextComponent;
    },
    mountComponent: function (nextComponent) {

        ReactComponent.BackendIDOperations.dangerouslyReplaceNodeWithMarkupByID
            = function () { };
        ReactEventEmitter.setEnabled = function () { };

        var componentInstance = instantiateReactComponent(nextComponent);
        var rootID = ".0";
        var transaction = RiactUpdateTransaction.getPooled();
        transaction.perform(
            Riact._mountComponentIntoNode,
            componentInstance,
            rootID,
            undefined,
            transaction,
            false);
        RiactUpdateTransaction.release(transaction);
        componentInstance.id = rootID;
        resolvePending();
        return componentInstance;
    },

    /**
     * @param {string} rootID DOM ID of the root node.
     * @param {DOMElement} container must be set to undefined
     * @param {ReactServerRenderingTransaction} transaction
     * @param {boolean} shouldReuseMarkup must be set to false
     * @final
     * @private
     */
    _mountComponentIntoNode: function (
            rootID,
            container,
            transaction,
            shouldReuseMarkup) {
        assert(container === undefined, "Riact does not render to containers");
        assert(shouldReuseMarkup === false, "Riact cannot reuse markup");
        // This function is a stub. There is no node to mount component into.
    },

    /**
     * Since `_pendingProps` is set, update the component.
     *
     * @param {ReactReconcileTransaction} transaction
     * @internal
     */
    _performUpdateIfNecessary: function (/*transaction*/) {
        assert(this._pendingProps !== null, "Call this via Riact.updateComponent");
        this.props = this._pendingProps;
        this._owner = this._pendingOwner;
        this._pendingProps = null;
        // This function is a stub. There is no node to update.
    }
};

React = require("react");
Dispatcher = require("./stores/dispatcher.ts");
SessionStore = require("./stores/session.ts");
PlaybackStore = require("./stores/playback.ts");
SongEditorStore = require("./stores/songEditor.ts");


/*******************
 * 2. RendererInst *
 *******************/

require("./webViews.ts");
var renderUtil = require("ripienoUtil/renderUtil");
var V_PADDING = renderUtil.V_PADDING;

var Renderer = require("./renderer/renderer.ts");


var RendererEnv = React.createClass({
    render: function() {
        var state = this.storeState();
        var width = this.props.width;
        var height = this.props.height;

        return state.staves ?
            Renderer({
                height: height,
                key: "renderer",
                marginBottom: V_PADDING,
                marginTop: V_PADDING,
                pageSize: state.pageSize,
                ref: "renderer",
                selection: state.selection,
                staveHeight: state.staveHeight,
                staves: state.staves,
                store: SongEditorStore.Instance,
                top: 44,
                raw: true,
                width: width
            }) :
            null;
    },
    componentWillMount: function() {
        SongEditorStore.addChangeListener(this._onChange);
        PlaybackStore.addChangeListener(this._onChange);
    },
    _onChange: function() {
        this.setState(this.storeState());
    },
    storeState: function() {
        return {
            pageSize: SongEditorStore.Instance.pageSize(),
            selection: SongEditorStore.Instance.selection(),
            staveHeight: SongEditorStore.Instance.staveHeight(),
            staves: SongEditorStore.Instance.staves(),
            playing: PlaybackStore.playing(),
            midiReady: PlaybackStore.ready()
        };
    },
    getInitialState: function() {
        return this.storeState();
    }
});

RendererInst = RendererEnv();
RendererInst = Riact.mountComponent(RendererInst);
