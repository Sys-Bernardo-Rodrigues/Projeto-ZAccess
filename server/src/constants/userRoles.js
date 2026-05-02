/** Papéis do painel (modelo User). Alinhar com o select em UsersPage.jsx. */
const USER_PANEL_ROLES = Object.freeze(['admin', 'operator', 'viewer', 'invite_manager']);

const isValidUserPanelRole = (role) => USER_PANEL_ROLES.includes(role);

/** Papéis permitidos no POST /api/auth/register (sem invite_manager). */
const USER_REGISTER_ROLES = Object.freeze(['admin', 'operator', 'viewer']);

module.exports = {
    USER_PANEL_ROLES,
    USER_REGISTER_ROLES,
    isValidUserPanelRole,
};
