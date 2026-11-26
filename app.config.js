// Adds Firebase (push notifications) only when google-services.json exists. The build writes it
// from the GOOGLE_SERVICES_JSON repository secret; without it the app builds and runs without push.
const fs = require("fs");

module.exports = ({ config }) => {
  if (fs.existsSync("./google-services.json")) {
    config.android = { ...config.android, googleServicesFile: "./google-services.json" };
  }
  return config;
};
