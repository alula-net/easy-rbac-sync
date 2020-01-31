import Debug from "debug";
const debug = Debug("rbac");

export function any(promises: any[]) {
  if (!promises || !promises.length) {
    return Promise.resolve(false);
  }

  return Promise.all(
    promises.map(($p: any) =>
      $p
        .catch((err: any) => {
          debug("Underlying promise rejected", err);
          return false;
        })
        .then((result: any) => {
          if (result) {
            throw new Error("authorized");
          }
        })
    )
  )
    .then(() => false)
    .catch(err => err && err.message === "authorized");
}

export function isGlob(str: string) {
  return str.includes("*");
}

export function globToRegex(str: string) {
  return new RegExp("^" + str.replace(/\*/g, ".*"));
}
