const { createConnection } = require("mysql");

const connection = createConnection({
  host: "gprcode-db.clxxh6imjxad.sa-east-1.rds.amazonaws.com",
  user: "gprcode",
  password: "EGbKo5nmcxruznRVeV62",
  database: "tvgpr",
});

module.exports = { connection };
