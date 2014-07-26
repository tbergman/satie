/**
 * Subclasses of Tools modify the abstract representation of the score
 * in some way in response to a user event. For example, a tool might
 * add a note or chord, change the duration of a note, or add a slur.
 *
 * Classes which extend Tool provide several key methods:
 *   - handleMouseMove: receives the coordinates of the mouse event and
 *      the object the user is hovering over, if applicable. If a preview
 *      is warrented, return a function accepting the parameters
 *      (obj, ctx) used in model.jsx.
 *      Otherwise, return false. If the current preview is sufficient, also
 *      return false.
 *
 *      The function returned by handleMouseMove MUST return -1 (indicating
 *      that the current object should be drawn) and MUST NOT cause reflow.
 *
 *      Simple tools do not need to reimplement handleMouseMove --
 *      only shouldHide() which returns true if the current preview should
 *      be removed, and action() with creates the preview.
 *
 *   - handleMouseClick: same idea as handleMouseMove, except instead of a
 *      preview, the returned function may cause reflow. The returned function
 *      should return an exit code as defined under the prereqs section in
 *      model.jsx. ctx.body MUST be able to be translated into lylite after
 *      handleMouseClick.
 *
 *      Simple tools do not need to reimplement handleMouseMove --
 *      only shouldHide() which returns true if the action should not take
 *      place, and action() which modifies the sheet music perminantely.
 *
 *   - handleMidiEvent: receives a midi key and velocity. A "note off" event
 *      is encoded as a midi key with 0 velocity. If an action should be
 *      performed, return a function as in handleMouseClick.
 *
 *   - hidePreview: Hide any previews created. Receives the same arguments
 *      (obj, ctx) as the function which creates the preview.
 *
 * You do not need to handle 'undo' - this is done for you.
 */

var assert = require("assert");
var _ = require("lodash");

class Tool {
    handleMouseMove(mouse, line, obj) {
        if (obj === this.curobj) {
            return false;
        }
        if (this.shouldHide(mouse, line, obj)) {
            return "hide";
        }

        return this.action.bind(this, mouse, line, true);
    }
    handleMouseClick(mouse, line, obj) {
        if (this.shouldHide(mouse, line, obj)) {
            return false;
        }
        return this.action.bind(this, mouse, line, false);
    }
    shouldHide(mouse, line, obj) {
        assert(false, "You either need to implement handleMouseMove, " +
                "or both shouldHide and action!");
    }
    action(mouse, line, obj) {
        assert(false, "You either need to implement handleMouseMove, " +
                "or both shouldHide and action!");
    }
    handleMidiEvent(key, velocity) {
        assert(false, "Not implemented");
    }
    handleKeyPressEvent(key, event) {
    }
    hidePreview(obj, ctx) {
        assert(this.stashed, "A preview was never made!");
        _.each(this.stashed, (value, key) => {
            obj[key] = value;
        });
        this.stashed = undefined;
        this.curline = undefined;
        this.curobj = undefined;
        return -1;
    }
    render(ctx, mouse) {
        return null;
    }
}

module.exports = Tool;
