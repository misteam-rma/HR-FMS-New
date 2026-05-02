export const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
};

export const normalizeRole = (value) => {
  const roleValue = value?.toString().trim().toLowerCase() || '';

  if (roleValue === 'admin' || roleValue === 'administrator' || roleValue === 'yes') {
    return 'admin';
  }

  return 'user';
};

export const isAdminUser = (user) => normalizeRole(user?.Role ?? user?.role ?? user?.Admin) === 'admin';

export const getDefaultRouteForUser = (user) => (isAdminUser(user) ? '/' : '/my-profile');
