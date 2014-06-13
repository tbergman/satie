/**
 * Dispatcher based on the Flux TodoMVC Tutorial.
 * http://facebook.github.io/react/docs/flux-todo-list.html
 *
 * "Flux is the application architecture that Facebook
 * uses for building client-side web applications. It
 * complements React's composable view components by
 * utilizing a unidirectional data flow. It's more of
 * a pattern rather than a formal framework, and you
 * can start using Flux immediately without a lot of
 * new code."
 *
 * See also ripieno
 */

var Promise = require('es6-promise').Promise;

var _callbacks = [];
var _promises = [];

/**
 * Add a promise to the queue of callback invocation promises.
 * @param {function} callback The Store's registered callback.
 * @param {object} payload The data from the Action.
 */
var _addPromise = function(callback, payload) {
    _promises.push(new Promise(function(resolve, reject) {
        if (callback(payload)) {
            resolve(payload);
        } else {
            reject(new Error('Dispatcher callback unsuccessful'));
        }
    }));
};

/**
 * Empty the queue of callback invocation promises.
 */
var _clearPromises = function() {
    _promises = [];
};

class Dispatcher {
    /**
     * Register a Store's callback so that it may be invoked by an action.
     * @param {function} callback The callback to be registered.
     * @return {number} The index of the callback within the _callbacks array.
     */
    register(callback) {
        _callbacks.push(callback);
        return _callbacks.length - 1; // index
    }

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    dispatch(action) {
        console.log("Dispatch: ", action);
        _callbacks.forEach(function(callback) {
            _addPromise(callback, action);
        });
        Promise
            .all(_promises)
            .then(_clearPromises)
            .catch((err) => {
                console.warn("Exception occured in promise", err);
            });
    }
};

module.exports = new Dispatcher();
