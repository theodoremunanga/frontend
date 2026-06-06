"use client";
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
exports.Dialog = Dialog;
exports.DialogClose = DialogClose;
exports.DialogContent = DialogContent;
exports.DialogDescription = DialogDescription;
exports.DialogFooter = DialogFooter;
exports.DialogHeader = DialogHeader;
exports.DialogOverlay = DialogOverlay;
exports.DialogPortal = DialogPortal;
exports.DialogTitle = DialogTitle;
exports.DialogTrigger = DialogTrigger;
var React = require("react");
var dialog_1 = require("@base-ui/react/dialog");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
function Dialog(_a) {
    var props = __rest(_a, []);
    return <dialog_1.Dialog.Root data-slot="dialog" {...props}/>;
}
function DialogTrigger(_a) {
    var props = __rest(_a, []);
    return <dialog_1.Dialog.Trigger data-slot="dialog-trigger" {...props}/>;
}
function DialogPortal(_a) {
    var props = __rest(_a, []);
    return <dialog_1.Dialog.Portal data-slot="dialog-portal" {...props}/>;
}
function DialogClose(_a) {
    var props = __rest(_a, []);
    return <dialog_1.Dialog.Close data-slot="dialog-close" {...props}/>;
}
function DialogOverlay(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<dialog_1.Dialog.Backdrop data-slot="dialog-overlay" className={(0, utils_1.cn)("fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)} {...props}/>);
}
function DialogContent(_a) {
    var className = _a.className, children = _a.children, _b = _a.showCloseButton, showCloseButton = _b === void 0 ? true : _b, props = __rest(_a, ["className", "children", "showCloseButton"]);
    return (<DialogPortal>
      <DialogOverlay />
      <dialog_1.Dialog.Popup data-slot="dialog-content" className={(0, utils_1.cn)("fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)} {...props}>
        {children}
        {showCloseButton && (<dialog_1.Dialog.Close data-slot="dialog-close" render={<button_1.Button variant="ghost" className="absolute top-4 right-4" size="icon-sm"/>}>
            <lucide_react_1.XIcon />
            <span className="sr-only">Close</span>
          </dialog_1.Dialog.Close>)}
      </dialog_1.Dialog.Popup>
    </DialogPortal>);
}
function DialogHeader(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="dialog-header" className={(0, utils_1.cn)("flex flex-col gap-2", className)} {...props}/>);
}
function DialogFooter(_a) {
    var className = _a.className, _b = _a.showCloseButton, showCloseButton = _b === void 0 ? false : _b, children = _a.children, props = __rest(_a, ["className", "showCloseButton", "children"]);
    return (<div data-slot="dialog-footer" className={(0, utils_1.cn)("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && (<dialog_1.Dialog.Close render={<button_1.Button variant="outline"/>}>
          Close
        </dialog_1.Dialog.Close>)}
    </div>);
}
function DialogTitle(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<dialog_1.Dialog.Title data-slot="dialog-title" className={(0, utils_1.cn)("font-heading leading-none font-medium", className)} {...props}/>);
}
function DialogDescription(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<dialog_1.Dialog.Description data-slot="dialog-description" className={(0, utils_1.cn)("text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)} {...props}/>);
}
