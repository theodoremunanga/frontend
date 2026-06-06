"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardFooter = CardFooter;
exports.CardTitle = CardTitle;
exports.CardAction = CardAction;
exports.CardDescription = CardDescription;
exports.CardContent = CardContent;
var React = require("react");
var utils_1 = require("@/lib/utils");
function Card(_a) {
    var className = _a.className, _b = _a.size, size = _b === void 0 ? "default" : _b, props = __rest(_a, ["className", "size"]);
    return (<div data-slot="card" data-size={size} className={(0, utils_1.cn)("group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl", className)} {...props}/>);
}
function CardHeader(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-header" className={(0, utils_1.cn)("group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4", className)} {...props}/>);
}
function CardTitle(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-title" className={(0, utils_1.cn)("font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm", className)} {...props}/>);
}
function CardDescription(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-description" className={(0, utils_1.cn)("text-sm text-muted-foreground", className)} {...props}/>);
}
function CardAction(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-action" className={(0, utils_1.cn)("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props}/>);
}
function CardContent(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-content" className={(0, utils_1.cn)("px-6 group-data-[size=sm]/card:px-4", className)} {...props}/>);
}
function CardFooter(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-footer" className={(0, utils_1.cn)("flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4", className)} {...props}/>);
}
