const rights = {
  VIEW_ALL_USERS: 'viewAllUsers',
  DELETE_USER: 'deleteUser',
  CREATE_ADMIN: 'createAdmin',
  MANAGE_SERIES: 'manageSeries',
  CREATE_CATEGORIES: 'createCategories',
  PROVIDE_ADMIN_ACCESS: 'provideAdminAccess',
  FORCE_UPLOAD_IMAGE: 'forceUploadImage',
  MANAGE_BANNER: 'manageBanner',
  GET_BANNER: 'getBanner',
  SUBSCRIPTION_MODEL_MANAGE: 'subscriptionModelManage',
  MANAGE_AUTHORS: 'manageAuthors',
};

const roleEnum = {
  user: 'user',
  admin: 'admin',
  superAdmin: 'superAdmin',
};

const allRoles = {
  [roleEnum.user]: [rights.GET_BANNER],
  [roleEnum.admin]: [
    rights.VIEW_ALL_USERS,
    rights.MANAGE_SERIES,
    rights.MANAGE_BANNER,
    rights.SUBSCRIPTION_MODEL_MANAGE,
    rights.MANAGE_AUTHORS,
  ],
  [roleEnum.superAdmin]: [
    rights.VIEW_ALL_USERS,
    rights.DELETE_USER,
    rights.MANAGE_SERIES,
    rights.CREATE_CATEGORIES,
    rights.PROVIDE_ADMIN_ACCESS,
    rights.FORCE_UPLOAD_IMAGE,
    rights.MANAGE_BANNER,
    rights.SUBSCRIPTION_MODEL_MANAGE,
    rights.CREATE_ADMIN,
    rights.MANAGE_AUTHORS,
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
  roleEnum,
  rights,
};
