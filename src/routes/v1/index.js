const express = require('express');
const docsRoute = require('./docs.route');
const config = require('../../config/config');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const seriesRoute = require('./series.route');
const categoryRoute = require('./category.route');
const noteRoute = require('./notes.route');
const bannerRoute = require('./banner.route');
const watchHistoryRoute = require('./watch-history.route');
const subscriptionRoute = require('./subscription.route');
const authorRoute = require('./author.route');
const contactRoute = require('./contact-us.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/series',
    route: seriesRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/notes',
    route: noteRoute,
  },
  {
    path: '/banners',
    route: bannerRoute,
  },
  {
    path: '/history',
    route: watchHistoryRoute,
  },
  {
    path: '/subscription',
    route: subscriptionRoute,
  },
  {
    path: '/author',
    route: authorRoute,
  },
  {
    path: '/contact',
    route: contactRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
