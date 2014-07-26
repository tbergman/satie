/**
 * The Ripieno client library C API implementation. JS helper.
 *
 * Copyright (C) Josh Netterfield 2014. All rights reserved.
 */

if (!Object.freeze) { // Old JSC on Win32
    Object.freeze = function() { return this; }
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

var DOMPropertyOperations = require("react/lib/DOMPropertyOperations");
var ReactBrowserComponentMixin = require("react/lib/ReactBrowserComponentMixin");
var ReactComponent = require("react/lib/ReactComponent");
var ReactComponentEnvironment = require("react/lib/ReactComponentBrowserEnvironment");
var ReactComponentMixin = ReactComponent.Mixin;
var ReactDOMComponent = require("react/lib/ReactDOMComponent");
var ReactEventEmitter = require("react/lib/ReactEventEmitter");
var ReactInputSelection = require("react/lib/ReactInputSelection");
var ReactMount = require("react/lib/ReactMount");
var ReactMultiChild = require("react/lib/ReactMultiChild");
var ReactReconcileTransaction = require("react/lib/ReactReconcileTransaction");
var ReactServerRenderingTransaction = require("react/lib/ReactServerRenderingTransaction");
var ReactUpdates = require("react/lib/ReactUpdates");
var RiactUpdateTransaction = require("./riactUpdateTransaction.js");
var _ = require("lodash");
var assert = require("assert");
var instantiateReactComponent = require("react/lib/instantiateReactComponent");
var shouldUpdateReactComponent = require("react/lib/shouldUpdateReactComponent");


/********************
 * 0. DUCK PUNCHING *
 ********************/

console.log("Help! I'm trapped in a C library.");

var pending = [];
_.defer = function(fn) {
    pending.push(fn);
}
var resolvePending = function() {
    while(pending.length) {
        pending[0]();
        pending.splice(0, 1);
    }
}

function noop() {};
        

/*************************
 * 1. GLOBAL ENVIRONMENT *
 *************************/

libripienoclient = {};
Riact = { // RIpieno reACT
    updateComponent: function(nextComponent, newProps) {
        var nextProps = nextComponent.props;
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
    mountComponent: function(nextComponent) {
        
        ReactComponent.BackendIDOperations.dangerouslyReplaceNodeWithMarkupByID
            = function() {}
        ReactEventEmitter.setEnabled = function() {}

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
    _mountComponentIntoNode: function(
            rootID,
            container,
            transaction,
            shouldReuseMarkup) {
        assert(container === undefined, "Riact does not render to containers");
        assert(shouldReuseMarkup === false, "Riact cannot reuse markup");
        var markup = this.mountComponent(rootID, transaction, 0);
    },

    /**
     * Since `_pendingProps` is set, update the component.
     *
     * @param {ReactReconcileTransaction} transaction
     * @internal
     */
    _performUpdateIfNecessary: function(transaction) {
        assert (this._pendingProps !== null, "Call this via Riact.updateComponent");
        var prevProps = this.props;
        var prevOwner = this._owner;
        this.props = this._pendingProps;
        this._owner = this._pendingOwner;
        this._pendingProps = null;
        var markup = this.updateComponent(transaction, prevProps, prevOwner);
    }
}

React = require("react");
Dispatcher = require("./stores/dispatcher.jsx");
SessionStore = require("./stores/session.jsx");
PlaybackStore = require("./stores/playback.jsx");
SongEditorStore = require("./stores/songEditor.jsx");


/*******************
 * 2. RendererInst *
 *******************/

require("./webViews.jsx");
var renderUtil = require("ripienoUtil/renderUtil.jsx");
var V_PADDING = renderUtil.V_PADDING;

var Renderer = require("./renderer/renderer.jsx");


var RendererEnv = React.createClass({
    render: function() {
        var state = this.storeState();
        var aspectRatio = state.staves ?
                state.pageSize.width / state.pageSize.height :
                1; // Set to 1 to prevent divide by zero.

        var width = this.props.width;
        var height = this.props.height;

        return state.staves ?
            <Renderer
                height={height}
                key="renderer"
                marginBottom={V_PADDING}
                marginTop={V_PADDING}
                pageSize={state.pageSize}
                ref="renderer"
                selection={state.selection}
                staveHeight={state.staveHeight}
                staves={state.staves}
                store={SongEditorStore}
                top={44}
                raw={true}
                width={width} /> :
            <noscript />;
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
            pageSize: SongEditorStore.pageSize(),
            selection: SongEditorStore.selection(),
            staveHeight: SongEditorStore.staveHeight(),
            staves: SongEditorStore.staves(),
            playing: PlaybackStore.playing(),
            midiReady: PlaybackStore.ready()
        };
    },
    getInitialState: function() {
        return this.storeState();
    }
});

RendererInst = <RendererEnv />;
RendererInst = Riact.mountComponent(RendererInst);
