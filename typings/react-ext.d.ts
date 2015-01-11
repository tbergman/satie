declare module 'react/lib/invariant' {
    function invariant(condition: boolean, format: string, param1?: any, param2?: any, param3?: any, param4?: any, param5?: any, param6?: any): void;
    export = invariant;
}

declare module 'react/lib/ReactComponentWithPureRenderMixin' {
    import React = require("react");
    var ReactComponentWithPureRenderMixin: React.Mixin<{}, {}>;
    export = ReactComponentWithPureRenderMixin;
}
