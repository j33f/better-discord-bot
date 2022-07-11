let nicks = [];

const interactionUserHaveRole = async (interaction, roleNameOrId = 'PJ') => {
  const role = await getRole(interaction, roleNameOrId);
  const member = await getMemberById(interaction.member.guild, interaction.user.id);
  return member._roles.includes(role.id);
};

const interactionUserHaveRoles = async (interaction, roleNamesOrIds = ['PJ']) => {
  const results = roleNamesOrIds.map(async (roleNameOrId) => {
    return await interactionUserHaveRole(interaction, roleNameOrId);
  });
  return results.some(r => r);
};

const changeNicknameByMemberId = async (guild, memberId, nickname) => {
  const member = await getMemberById(guild, memberId);
  nicks.push({ id: memberId, oldNick: member.nickname });
  console.log(memberId, nickname);
  await member.setNickname(nickname);
};

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
 * @param interaction
 * @param roleName
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
 * @param interaction
 * @param roleId
 * @returns {Promise<*>}
 */
const getMembersByRoleId = async (interaction, roleId) => {
  const members = await interaction.member.guild.members.fetch();
  return members.filter(member => member._roles.includes(roleId));
};

/**
 * get members which have the given role (by name)
 * @param interaction
 * @param roleName
 * @returns {Promise<*>}
 */
const getMembersByRoleName = async (interaction, roleName = 'PJ') => {
  const roleId = await getRoleId(interaction, roleName);
  return await getMembersByRoleId(interaction, roleId);
};

const getMembersByRole = async (interaction, roleNameOrId = 'PJ') => {
  const role = await getRole(interaction, roleNameOrId);
  return await getMembersByRoleId(interaction, role.id);
};

const getMemberById = async (guild, id) => {
  const members = await guild.members.fetch();
  return members.get(id);
};

module.exports = { interactionUserHaveRole, interactionUserHaveRoles, changeNicknameByMemberId, resetNicknames, getMemberById, getMembersByRole, getMembersByRoleId, getMembersByRoleName, getRole, getRoleId };