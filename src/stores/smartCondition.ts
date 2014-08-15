import Context = require("./context");
import IterationStatus = require("./iterationStatus");

interface SmartCondition {
    condition: (ctx: Context) => boolean;
    correction: (ctx: Context) => IterationStatus;
    description: string;
}

export = SmartCondition;