class User {
  constructor({ member, user, guild }) {
    this.initialized = false;

    if (user && guild) {
      this.member = guild.members.cache.get(user.id);
    }

    if (member) {
      this.member = member;
    }
    if (!this.member) {
      this.member = null;
      this.user = user;
      this.userId = user.id;
      this.guild = null;
      this.roles = [];
      this.originalNickname = '';
      this.currentNickname = '';
      this.initialized = true;
    }

    if (this.member) {
      this.user = this.member.user;
      this.guild = this.member.guild;
      this.userId = this.member.user.id;
      this.originalNickname = this.member.nickname;
      this.currentNickname = this.member.nickname;
      this.roles = this.member.roles.cache;
      this.initialized = true;
    }

    this.isBot = this.user.bot || false;

    if (!this.initialized) {
      throw new Error('[Discord Bot] User class must be initialized with a member only or both a user and a guild');
    }
  }

  hasRole(roleNameOrId) {
    /**
     * @param roleNameOrId {string} the role name or id to check
     * @returns {boolean}
     */
    return this.roles.some(r => r.name === roleNameOrId || r.id === roleNameOrId);
  }

  hasOneOfRoles(roleNamesOrIds) {
    /**
     * @param roleNamesOrIds {string[]} the role names or ids to check
     * @returns {boolean}
     */
    return roleNamesOrIds.some(r => this.hasRole(r));
  }

  setNickname(nickname) {
    /**
     * @param nickname {string} the nickname to set
     * @returns {Promise<void>}
     */
    this.currentNickname = nickname;
    return this.member.setNickname(nickname);
  }

  resetNickname() {
    /**
     * @returns {Promise<void>}
     */
    this.currentNickname = this.originalNickname;
    return this.setNickname(this.originalNickname);
  }
}

export default User;
