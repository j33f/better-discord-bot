'use strict';
let nicks = []; // local nicknames cache

/**
 * Interaction initiator have the given role ?
 * @param interaction
 * @param roleNameOrId
 * @returns {Promise<boolean>}
 */
const interactionUserHaveRole = async (interaction, roleNameOrId = 'PJ') => {
  const role = await getRole(interaction, roleNameOrId);
  const member = await getMemberById(interaction.member.guild, interaction.user.id);
  return member._roles.includes(role.id);
};

/**
 * Interaction initiator have the given roles ?
 * @param interaction {Interaction} the interaction
 * @param roleNamesOrIds {Array<string>} Array of role names or ids
 * @returns {Promise<boolean>}
 */
const interactionUserHaveRoles = async (interaction, roleNamesOrIds = ['nothing']) => {
  const promises = roleNamesOrIds.map(r => interactionUserHaveRole(interaction, r));
  const results = await Promise.all(promises);
  return results.some(r => r);
};

/**
 * Change a guild nickname for a member
 * @param guild {Guild} the guild
 * @param memberId {string} the member id
 * @param nickname {string} the nickname to put on
 * @returns {Promise<void>}
 */
const changeNicknameByMemberId = async (guild, memberId, nickname) => {
  const member = await getMemberById(guild, memberId);
  // stores the old nicknames in local cache
  nicks.push({ id: memberId, oldNick: member.nickname });
  await member.setNickname(nickname);
};

/**
 * Reset all changed nicknames back to the old ones and clear the cache
 * @param guild {Guild} the guild
 * @returns {Promise<void>}
 */
const resetNicknames = async (guild) => {
  for (const m of nicks) {
    const user = await getMemberById(guild, m.id);
    await user.setNickname(m.oldNick);
  }
  nicks = [];
};

/**
 * get a role by name or id
 * @param interaction
 * @param roleNameOrId
 * @returns {Promise<*>}
 */
const getRole = async (interaction, roleNameOrId = 'PJ') => {
  const roles = await interaction.member.guild.roles.fetch();
  const map = roles.filter(r => r.name === roleNameOrId || r.id === roleNameOrId);
  const [role] = map.values();
  return role;
};

/**
 * get a role ID by its name
 * @param interaction {Interaction} the interaction we are using right now
 * @param roleName {string} the role name to get the id of
 * @returns {Promise<*>}
 */
const getRoleId = async (interaction, roleName = 'PJ') => {
  const roles = await interaction.member.guild.roles.fetch();
  const map = roles.filter(r => r.name === roleName);
  const [roleId] = map.keys();
  return roleId;
};

/**
 * get members which have the given role (by id)
 * @param interaction {Interaction} the interaction we are using right now
 * @param roleId {string} the role id to get the members of
 * @returns {Promise<*>}
 */
const getMembersByRoleId = async (interaction, roleId) => {
  const members = await interaction.member.guild.members.fetch();
  return members.filter(member => member._roles.includes(roleId));
};

/**
 * get members which have the given role (by name)
 * @param interaction {Interaction} the interaction we are using right now
 * @param roleName {string} the role name to get the members of
 * @returns {Promise<*>}
 */
const getMembersByRoleName = async (interaction, roleName = 'PJ') => {
  const roleId = await getRoleId(interaction, roleName);
  return await getMembersByRoleId(interaction, roleId);
};

/**
 * get the members which have the given role (by name or id)
 * @param interaction {Interaction} the interaction we are using right now
 * @param roleNameOrId {string} the role name or id to get the members of
 * @returns {Promise<*>}
 */
const getMembersByRole = async (interaction, roleNameOrId = 'PJ') => {
  const role = await getRole(interaction, roleNameOrId);
  return await getMembersByRoleId(interaction, role.id);
};

/**
 * get a member object from its id
 * @param guild {Guild} the guild
 * @param id {string} the member id
 * @returns {Promise<Member>}
 */
const getMemberById = async (guild, id) => {
  const members = await guild.members.fetch();
  return members.get(id);
};

module.exports = { interactionUserHaveRole, interactionUserHaveRoles, changeNicknameByMemberId, resetNicknames, getMemberById, getMembersByRole, getMembersByRoleId, getMembersByRoleName, getRole, getRoleId };