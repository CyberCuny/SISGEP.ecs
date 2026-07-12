export const ROLES = {
  ADMIN: 'Administrador',
  DIRECTOR: 'Directivo',
  APPROVER: 'Aprobador',
  PLANNER: 'Planificador',
  EXECUTOR: 'Ejecutor',
};

const HIERARCHY = [ROLES.EXECUTOR, ROLES.PLANNER, ROLES.APPROVER, ROLES.DIRECTOR];

export function hasRole(user, roleName) {
  if (!user) return false;
  if (user.is_staff) return true;
  return (user.roles || []).some((r) => r.name === roleName);
}

export function hasAnyRole(user, roleNames) {
  if (!user) return false;
  if (user.is_staff) return true;
  return (user.roles || []).some((r) => roleNames.includes(r.name));
}

export function getHighestRole(user) {
  if (!user) return null;
  if (user.is_staff) return ROLES.ADMIN;
  const userRoles = (user.roles || []).map((r) => r.name);
  for (let i = HIERARCHY.length - 1; i >= 0; i--) {
    if (userRoles.includes(HIERARCHY[i])) return HIERARCHY[i];
  }
  return null;
}

export function isAtLeast(user, minRoleName) {
  if (!user) return false;
  if (user.is_staff) return true;
  const userHighest = getHighestRole(user);
  const minIdx = HIERARCHY.indexOf(minRoleName);
  const userIdx = HIERARCHY.indexOf(userHighest);
  return userIdx >= minIdx;
}
