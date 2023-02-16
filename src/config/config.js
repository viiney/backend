const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    REDIS_HOST: Joi.string().required().description('Redis host url'),
    REDIS_PORT: Joi.string().required().description('Redis port'),
    REDIS_PASSWORD: Joi.string().required().description('Redis password'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    OTP_EXPIRATION_MINUTES: Joi.number().default(30).description('OTP expire time'),
    SMTP_SERVICE: Joi.string().description('service that will send the emails'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_TO: Joi.string().description('the from field in the emails sent to by the app'),
    S3_ACCESS_KEY_ID: Joi.string().required().description('S3_ACCESS_KEY_ID is required'),
    S3_ACCESS_KEY_SECRET: Joi.string().required().description('S3_ACCESS_KEY_SECRET is required'),
    S3_BUCKET_NAME: Joi.string().required().description('S3_BUCKET_NAME is required'),
    S3_REGION_NAME: Joi.string().required().description('S3_REGION_NAME is required'),
    RAZOR_PAY_KEY_ID: Joi.string().required().description('RAZOR_PAY_KEY_ID is required'),
    RAZOR_PAY_KEY_SECRET: Joi.string().required().description('RAZOR_PAY_KEY_SECRET is required'),
    TWILIO_ACCOUNT_SID: Joi.string().required().description('TWILIO_ACCOUNT_SID is required'),
    TWILIO_AUTH_TOKEN: Joi.string().required().description('TWILIO_AUTH_TOKEN is required'),
    TWILIO_PHONE_NUMBER: Joi.string().required().description('TWILIO_PHONE_NUMBER is required'),
    EXOTEL_API_KEY: Joi.string().required().description('EXOTEL_API_KEY is required'),
    EXOTEL_API_TOKEN: Joi.string().required().description('EXOTEL_API_TOKEN is required'),
    EXOTEL_ACCOUNT_SID: Joi.string().required().description('EXOTEL_ACCOUNT_SID is required'),
    EXOTEL_SUBDOMAIN: Joi.string().required().description('EXOTEL_SUBDOMAIN is required'),
    EXOTEL_CALLER_ID: Joi.string().required().description('EXOTEL_CALLER_ID is required'),
    EXOTEL_SENDER_ID: Joi.string().required().description('EXOTEL_SENDER_ID is required'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.password,
  },
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      autoIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    otpExpirationInMin: envVars.OTP_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_SERVICE,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    to: envVars.EMAIL_TO,
  },
  s3Config: {
    s3AccessKeyId: envVars.S3_ACCESS_KEY_ID,
    s3AccessKeySecret: envVars.S3_ACCESS_KEY_SECRET,
    s3BucketName: envVars.S3_BUCKET_NAME,
    s3RegionName: envVars.S3_REGION_NAME,
  },
  razorPay: {
    keyId: envVars.RAZOR_PAY_KEY_ID,
    keySecret: envVars.RAZOR_PAY_KEY_SECRET,
  },
  hmsTemplateId: '',
  freePodcastMin: 5,
  totalFreeEpisodeInSeries: 1,
  bannerType: { PodcastEvent: 'PodcastEvent', PodcastRecording: 'PodcastRecording', Series: 'Series' },
  historyType: { Podcast: 'Podcast', Episode: 'Episode' },
  paymentStatus: {
    CREATED: 'CREATED',
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
    ATTEMPT_FAIL: 'ATTEMPT_FAIL',
  },
  paymentMarkFailThreshold: 1 * 60 * 60 * 1000, // in hours
  thresholdForLivePaidUsers: 1 * 60 * 60 * 1000, // in hours
  liveUserThreshold: 10 * 60 * 1000, // in minutes
  liveUserInDays: 1 * 24 * 60 * 60 * 1000, // in days
  cacheSeriesThreshold: 15 * 60, // in seconds
  cacheEpisodeThreshold: 15 * 60, // in seconds
  cacheBannerThreshold: 15 * 60, // in seconds
  cacheAuthorSeriesThreshold: 15 * 60, // in seconds
  twilio: {
    phoneNumber: envVars.TWILIO_PHONE_NUMBER,
    sid: envVars.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN,
  },
  exotel: {
    apiKey: envVars.EXOTEL_API_KEY,
    apiToken: envVars.EXOTEL_API_TOKEN,
    accountSid: envVars.EXOTEL_ACCOUNT_SID,
    subdomain: envVars.EXOTEL_SUBDOMAIN,
    callerId: envVars.EXOTEL_CALLER_ID,
    senderId: envVars.EXOTEL_SENDER_ID,
  },
  otpSize: 6,
  referralCodeSize: 10,
  numberThatCanHaveMultipleLogin: ['8826870787', '7042353004', '9899588738', '9891943413'],
  authorSeriesStatus: {
    PROMOTED: 'PROMOTED',
    ALL: 'ALL',
    NON_PROMOTED: 'NON_PROMOTED',
  },
};
