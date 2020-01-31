import { any, globToRegex, isGlob } from "./utils";
import Debug from "debug";
const debug = Debug("rbac");

export interface IWhenConfig {
  name: string;
  when<T>(params: T): boolean | Promise<boolean>;
}

export interface IRoleConfig {
  can: Array<string | IWhenConfig>;
  inherits?: string[];
}

export interface IRBACConfig {
  [role: string]: IRoleConfig;
}

export type RoleMap = Map<string, any>;

export type AsyncRBACConfig = () => Promise<IRBACConfig>;

interface IRoleObject {
  can: any;
  canGlob: any[];
  inherits?: string[];
}

export default class RBAC {
  private _inited: boolean;
  private _init: any;
  private roles: any;

  static create(opts: IRBACConfig) {
    return new RBAC(opts);
  }

  constructor(roles: IRBACConfig) {
    this._inited = false;
    debug("sync init");
    // Add roles to class and mark as inited
    this.roles = this.parseRoleMap(roles);
    this._inited = true;
  }

  private parseRoleMap(roles: IRBACConfig) {
    debug("parsing rolemap");
    // If not a function then should be object
    if (typeof roles !== "object") {
      throw new TypeError("Expected input to be object");
    }

    let map = new Map();

    // Standardize roles
    Object.keys(roles).forEach(role => {
      let roleObj: IRoleObject = {
        can: {},
        canGlob: []
      };

      // Check can definition
      if (!Array.isArray(roles[role].can)) {
        throw new TypeError("Expected roles[" + role + "].can to be an array");
      }
      if (roles[role].inherits) {
        if (!Array.isArray(roles[role].inherits)) {
          throw new TypeError(
            "Expected roles[" + role + "].inherits to be an array"
          );
        }

        roleObj.inherits = [];
        roles[role].inherits!.forEach(child => {
          if (typeof child !== "string") {
            throw new TypeError(
              "Expected roles[" + role + "].inherits element"
            );
          }

          if (!roles[child]) {
            throw new TypeError("Undefined inheritance role: " + child);
          }

          roleObj.inherits!.push(child);
        });
      }

      // Iterate allowed operations
      roles[role].can.forEach(operation => {
        // If operation is string
        if (typeof operation === "string") {
          // Add as an operation
          if (!isGlob(operation)) {
            roleObj.can[operation] = 1;
          } else {
            roleObj.canGlob.push({
              name: globToRegex(operation),
              original: operation
            });
          }
          return;
        }

        // Check if operation has a .when function
        if (
          typeof operation.when === "function" &&
          typeof operation.name === "string"
        ) {
          if (!isGlob(operation.name)) {
            roleObj.can[operation.name] = operation.when;
          } else {
            roleObj.canGlob.push({
              name: globToRegex(operation.name),
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

  public can(role: string | string[], operation: string, params: any): boolean {
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
    if (
      !$role.can[operation] &&
      !$role.canGlob.find((glob: any) => glob.name.test(operation))
    ) {
      debug("Not allowed at this level, try higher");
      // If no parents reject
      if (!$role.inherits || $role.inherits.length < 1) {
        debug("No inherit, reject false");
        return false;
      }
      // Return if any parent resolves true or all reject
      return $role.inherits.some((parent: string) => {
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
    let globMatch = $role.canGlob.find((glob: any) =>
      glob.name.test(operation)
    );

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
