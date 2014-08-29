/**
* If your React component's render function is "pure", e.g. it will render the
* same result given the same props and state, provide this Mixin for a
* considerable performance boost.
*
* Most React components have pure render functions.
*
* This is an alternative to React's ReactComponentWithPureRenderMixin that does
* a semi-deep comparison instead of a shallow comparison. When a shallow comparison
* suffices, use React's default component instead. For performance, deep comparisons
* assume the order of keys is equal in both objects. If this is an issue, an alternative
* comparison method should be used.
*/
var DeepPureMixin = {
  shouldComponentUpdate: function(nextProps, nextState) {
    var ret = !definitelyEqual(this.props, nextProps) ||
              !definitelyEqual(this.state, nextState);
    return ret;
  }
};

function definitelyEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }
  var diffs = [];
  var key;
  // Test for A's keys different from B.
  for (key in objA) {
    if (objA.hasOwnProperty(key) &&
        (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
      if (!(objA[key] instanceof Object) || !(objB[key] instanceof Object)) {
        return false;
      } else {
        // Hope that some other difference means that we don't actually have to deeply check.
        diffs.push(key);
      }
    }
  }

  // Test for B'a keys missing from A.
  for (key in objB) {
    if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
      return false;
    }
  }

  // Check semi-deeply if needed.
  for (var i = 0; i < diffs.length; ++i) {
      // This is efficient, but depends on the order of keys in both objects
      // to be the same.
      var cmpA, cmpB;
      if (diffs[i] === "children") {
          cmpA = objA.children.props;
          cmpB = objB.children.props;
      } else {
          cmpA = objA[diffs[i]];
          cmpB = objB[diffs[i]];
      }
      if (JSON.stringify(cmpA) !== JSON.stringify(cmpB)) {
          return false;
      }
  }

  return true;
}

module.exports = DeepPureMixin;
