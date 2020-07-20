"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globToRegex = exports.isGlob = exports.any = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default("rbac");
function any(promises) {
    if (!promises || !promises.length) {
        return Promise.resolve(false);
    }
    return Promise.all(promises.map(($p) => $p
        .catch((err) => {
        debug("Underlying promise rejected", err);
        return false;
    })
        .then((result) => {
        if (result) {
            throw new Error("authorized");
        }
    })))
        .then(() => false)
        .catch(err => err && err.message === "authorized");
}
exports.any = any;
function isGlob(str) {
    return str.includes("*");
}
exports.isGlob = isGlob;
function globToRegex(str) {
    return new RegExp("^" + str.replace(/\*/g, ".*"));
}
exports.globToRegex = globToRegex;
