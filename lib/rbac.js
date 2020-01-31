"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default("rbac");
class RBAC {
    constructor(roles) {
        this._inited = false;
        debug("sync init");
        // Add roles to class and mark as inited
        this.roles = this.parseRoleMap(roles);
        this._inited = true;
    }
    static create(opts) {
        return new RBAC(opts);
    }
    parseRoleMap(roles) {
        debug("parsing rolemap");
        // If not a function then should be object
        if (typeof roles !== "object") {
            throw new TypeError("Expected input to be object");
        }
        let map = new Map();
        // Standardize roles
        Object.keys(roles).forEach(role => {
            let roleObj = {
                can: {},
                canGlob: []
            };
            // Check can definition
            if (!Array.isArray(roles[role].can)) {
                throw new TypeError("Expected roles[" + role + "].can to be an array");
            }
            if (roles[role].inherits) {
                if (!Array.isArray(roles[role].inherits)) {
                    throw new TypeError("Expected roles[" + role + "].inherits to be an array");
                }
                roleObj.inherits = [];
                roles[role].inherits.forEach(child => {
                    if (typeof child !== "string") {
                        throw new TypeError("Expected roles[" + role + "].inherits element");
                    }
                    if (!roles[child]) {
                        throw new TypeError("Undefined inheritance role: " + child);
                    }
                    roleObj.inherits.push(child);
                });
            }
            // Iterate allowed operations
            roles[role].can.forEach(operation => {
                // If operation is string
                if (typeof operation === "string") {
                    // Add as an operation
                    if (!utils_1.isGlob(operation)) {
                        roleObj.can[operation] = 1;
                    }
                    else {
                        roleObj.canGlob.push({
                            name: utils_1.globToRegex(operation),
                            original: operation
                        });
                    }
                    return;
                }
                // Check if operation has a .when function
                if (typeof operation.when === "function" &&
                    typeof operation.name === "string") {
                    if (!utils_1.isGlob(operation.name)) {
                        roleObj.can[operation.name] = operation.when;
                    }
                    else {
                        roleObj.canGlob.push({
                            name: utils_1.globToRegex(operation.name),
                            original: operation.name,
                            when: operation.when
                        });
                    }
                    return;
                }
                throw new TypeError("Unexpected operation type: " + operation);
            });
            map.set(role, roleObj);
        });
        return map;
    }
    can(role, operation, params) {
        if (Array.isArray(role)) {
            debug("array of roles, try all");
            return role.some(r => this.can(r, operation, params));
        }
        if (typeof role !== "string") {
            debug("Expected first parameter to be string : role");
            return false;
        }
        if (typeof operation !== "string") {
            debug("Expected second parameter to be string : operation");
            return false;
        }
        const $role = this.roles.get(role);
        if (!$role) {
            debug("Undefined role");
            return false;
        }
        // IF this operation is not defined at current level try higher
        if (!$role.can[operation] &&
            !$role.canGlob.find((glob) => glob.name.test(operation))) {
            debug("Not allowed at this level, try higher");
            // If no parents reject
            if (!$role.inherits || $role.inherits.length < 1) {
                debug("No inherit, reject false");
                return false;
            }
            // Return if any parent resolves true or all reject
            return $role.inherits.some((parent) => {
                debug("Try from " + parent);
                return this.can(parent, operation, params);
            });
        }
        // We have the operation resolve
        if ($role.can[operation] === 1) {
            debug("We have a match, resolve");
            return true;
        }
        // Operation is conditional, run async function
        if (typeof $role.can[operation] === "function") {
            debug("Operation is conditional, run fn");
            return $role.can[operation](params);
        }
        // Try globs
        let globMatch = $role.canGlob.find((glob) => glob.name.test(operation));
        if (globMatch && !globMatch.when) {
            debug(`We have a globmatch (${globMatch.original}), resolve`);
            return true;
        }
        if (globMatch && globMatch.when) {
            debug(`We have a conditional globmatch (${globMatch.original}), run fn`);
            return globMatch.when(params);
        }
        // No operation reject as false
        debug("Shouldnt have reached here, something wrong, reject");
        throw new Error("something went wrong");
    }
}
exports.default = RBAC;
