const httpStatus = require('http-status');
const { Types } = require('mongoose');
const { User, Subscription, FileUpload, ReferralCode } = require('../models');
const ApiError = require('../utils/ApiError');
const { pickWithNoEmpty } = require('../utils/pick');
const { uploadImageToS3 } = require('../utils/s3Utils');
const { roleEnum } = require('../config/roles');
const { generate } = require('../utils/otpGenerator');
const { referralCodeSize, liveUserThreshold, liveUserInDays, paymentStatus } = require('../config/config');
/**
 * Create a user
 * @param {Object} userBody
 * @param {string} userBody.phoneNumber
 * @param {string} userBody.email
 * @param {string} userBody.name
 * @param {string} userBody.dob
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const userBodyCopy = { ...userBody };
  // TODO: Is user blacklisted?
  const isEmailTaken = await User.isEmailTaken(userBody.email);
  const isPhoneNumberTaken = await User.isPhoneNumberTaken(userBody.phoneNumber);
  if (isEmailTaken) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already taken');
  }
  if (isPhoneNumberTaken) {
    throw new ApiError(httpStatus.CONFLICT, 'Phone Number already taken');
  }
  return User.create(userBodyCopy);
};

/**
 * Create a admins
 * @param {Object} userBody
 * @param {string} userBody.phoneNumber
 * @param {string} userBody.email
 * @param {string} userBody.name
 * @param {number} userBody.dob
 * @param {Object} image
 * @param {string} image.fieldname
 * @param {string} image.originalname
 * @param {BufferEncoding} image.encoding
 * @param {string} image.mimetype
 * @param {number} image.size
 * @param {Buffer} image.buffer * @returns {Promise<User>}
 */
const createAdmin = async ({ name, email, phoneNumber, image, dob }) => {
  const isEmailTaken = await User.isEmailTaken(email);
  const isPhoneNumberTaken = await User.isPhoneNumberTaken(phoneNumber);
  if (isEmailTaken) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already taken');
  }
  if (isPhoneNumberTaken) {
    throw new ApiError(httpStatus.CONFLICT, 'Phone Number already taken');
  }
  const imageIds = uploadImageToS3([image]);

  return User.create({
    name,
    email,
    phoneNumber,
    image: imageIds[0],
    role: roleEnum.admin,
    dob,
  });
};

/**
 * Query for users
 * @param {Object} filter
 * @param {string} [filter.name]
 * @param {string} [filter.email]
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} queryRole - query role
 * @param {string} userRole - user role
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options, queryRole, userRole) => {
  const roleFilter = {
    ...(userRole === roleEnum.admin && { $nin: [roleEnum.superAdmin] }),
    ...(queryRole && { $in: [queryRole] }),
  };
  const filterOption = {
    $or: Object.keys(filter)
      .filter((key) => filter[key])
      .map((key) => {
        return {
          [key]: { $regex: filter[key], $options: 'i' },
        };
      }),
    ...(Object.keys(roleFilter).length > 0 && { role: roleFilter }),
  };
  const hasAnyFilter = Object.keys(filter).length !== 0;
  const roleFilterOption = Object.keys(roleFilter).length > 0 ? { role: roleFilter } : {};
  const users = await User.paginate({ ...(hasAnyFilter ? filterOption : roleFilterOption), isDeleted: false }, options, [
    {
      $lookup: {
        from: Subscription.collectionName,
        localField: '_id',
        foreignField: 'userId',
        as: 'subscription',
        pipeline: [
          {
            $match: { status: paymentStatus.SUCCESS },
          },
          {
            $project: {
              subscriptionDetail: 1,
              _id: 0,
            },
          },
        ],
      },
    },
  ]);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const user = await User.findOne({ _id: id, isDeleted: false }, { isDeleted: 0, updatedAt: 0, __v: 0 })
    .populate('image')
    .exec();
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found or is blacklisted');
  }
  const subscriptionValidTill = await Subscription.findSubscriptionValidTill(user._id);

  const userObj = user.toObject();
  userObj.id = user._id;
  delete userObj._id;

  if (userObj.image) {
    userObj.image = FileUpload.s3Url(userObj.image);
  }
  userObj.isPremiumValid = subscriptionValidTill > Date.now();
  userObj.subscriptionValidTill = subscriptionValidTill;
  if (!userObj.referralCode) {
    const referralCode = generate(referralCodeSize, {
      digits: true,
      upperCaseAlphabets: true,
    });
    const response = await User.updateOne({ _id: user.id }, { referralCode }).exec();
    if (response.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to create referral code');
    }
    userObj.referralCode = referralCode;
  }
  return userObj;
};

/**
 * @param {string} userId
 * @returns {Promise<User>}
 */
const softDeleteByUserId = async (userId) => {
  const user = await getUserById(userId);
  const canDeleteRole = [roleEnum.user, roleEnum.admin];
  if (!canDeleteRole.includes(user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, `You don't have access to delete anyone else then${canDeleteRole.join(',')}`);
  }
  return User.updateOne({ _id: Types.ObjectId(userId) }, { isDeleted: true });
};

/**
 * Get user by phoneNumber
 * @param {string} phoneNumber
 * @returns {Promise<User>}
 */
const getUserByPhoneNumber = async (phoneNumber) => {
  const user = await User.findOne(
    { phoneNumber, isDeleted: false },
    {
      email: 1,
      phoneNumber: 1,
      fullName: 1,
      roles: 1,
    }
  ).exec();
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found or has been blacklisted');
  }
  return user;
};

/**
 * Update user by id
 * @param {string} userId
 * @param {Object} updateBody
 * @param {string} [updateBody.name]
 * @param {string} [updateBody.description]
 * @param {string} [updateBody.email]
 * @param {string} [updateBody.state]
 * @param {string} [updateBody.city]
 * @param {string} [updateBody.qualification]
 * @param {string} [updateBody.preparingFor]
 * @param {number} [updateBody.dob]
 * @param {Object} image
 * @param {string} image.fieldname
 * @param {string} image.originalname
 * @param {BufferEncoding} image.encoding
 * @param {string} image.mimetype
 * @param {number} image.size
 * @param {Buffer} image.buffer
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody, image) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const allowedUpdates = [
    'name',
    'description',
    'email',
    'dob',
    'state',
    'city',
    'qualification',
    'preparingFor',
    'occupation',
  ];
  const noneEmptyUpdate = pickWithNoEmpty(updateBody, allowedUpdates);
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (image) {
    const imageUrls = await uploadImageToS3([image]);
    // eslint-disable-next-line prefer-destructuring
    noneEmptyUpdate.image = imageUrls[0];
  }
  const response = await User.updateOne({ _id: Types.ObjectId(userId) }, noneEmptyUpdate).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Unable to update user.');
  }
  return getUserById(userId);
};

/**
 *
 * @param {string} userId
 * @return {Promise<void>}
 */
const provideAdminAccess = async (userId) => {
  await User.valid(userId);
  await User.canProvideAdminAccess(userId);
  const response = await User.updateOne({ _id: Types.ObjectId(userId) }, { role: roleEnum.admin }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Unable to provide admin access.');
  }
};

const countReferralCode = async (referralCode, signupUserId, metaInfo) => {
  await User.valid(signupUserId);
  const referralCodeFrom = await User.findOne({ referralCode }).exec();
  const referral = await ReferralCode.findOne({
    referralCodeFrom: referralCodeFrom._id,
    referralCodeFor: signupUserId,
  }).exec();
  if (referral) {
    return;
  }
  await ReferralCode.create({
    referralCodeFrom: referralCodeFrom._id,
    referralCodeFor: signupUserId,
    metaInfo,
  });
};

// const getReferralForAllUsers = async () => {
//
// };

const getUserLiveData = async () => {
  const totalUsers = await User.find({ isDeleted: false, role: roleEnum.user }).exec();
  const totalAdmins = await User.find({ isDeleted: false, role: roleEnum.admin }).exec();
  const totalSuperAdmins = await User.find({ isDeleted: false, role: roleEnum.superAdmin }).exec();
  const totalPaidUsers = await Subscription.countUsersWithSubscription();

  const totalLiveUsers = totalUsers.filter((user) => user.lastPlayedAnyEpisodeAt >= Date.now() - liveUserThreshold).length;
  const totalLiveUsersInWholeDay = totalUsers.filter(
    (user) => user.lastPlayedAnyEpisodeAt >= Date.now() - liveUserInDays
  ).length;
  return {
    users: totalUsers.length,
    admins: totalAdmins.length,
    superAdmins: totalSuperAdmins.length,
    paidUsers: totalPaidUsers,
    activeUsers: totalLiveUsers,
    activeUsersInLast24Hours: totalLiveUsersInWholeDay,
  };
};
module.exports = {
  createUser,
  getUserById,
  updateUserById,
  getUserByPhoneNumber,
  queryUsers,
  softDeleteByUserId,
  provideAdminAccess,
  createAdmin,
  countReferralCode,
  getUserLiveData,
};
