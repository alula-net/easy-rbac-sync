"use strict";

var roles = {
  user: {
    can: [
      "account:add",
      "account:save",
      "account:delete",
      "post:add",
      {
        name: "post:save",
        when: params => params.ownerId === params.postId
      },
      {
        name: "post:create",
        when: params => params.ownerId === params.postId
      },
      "user:create",
      {
        name: "user:*",
        when: params => params.id === params.userId
      }
    ]
  },
  manager: {
    can: [
      "account:*",
      "post:save",
      "post:delete",
      {
        name: "post:rename",
        when: params => params.ownerId === params.postId
      },
      {
        name: "user:*",
        when: params => params.regionId === params.userRegionId
      }
    ],
    inherits: ["user"]
  },
  admin: {
    can: ["rule the world", "user:*"],
    inherits: ["manager"]
  }
};

module.exports.all = roles;
