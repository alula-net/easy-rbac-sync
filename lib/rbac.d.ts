export interface IWhenConfig {
    name: string;
    when(params: any): boolean;
}
export interface IRoleConfig {
    can: Array<string | IWhenConfig>;
    inherits?: string[];
}
export interface IRBACConfig {
    [role: string]: IRoleConfig;
}
export declare type RoleMap = Map<string, any>;
export declare type AsyncRBACConfig = () => Promise<IRBACConfig>;
export default class RBAC {
    private _inited;
    private _init;
    private roles;
    static create(opts: IRBACConfig): RBAC;
    constructor(roles: IRBACConfig);
    private parseRoleMap;
    can(role: string | string[], operation: string, params: any): boolean;
}
