// db.js
const mysql = require("mysql");

const pool = mysql.createPool({
  host: "gprcode-db.clxxh6imjxad.sa-east-1.rds.amazonaws.com",
  user: "gprcode",
  password: "EGbKo5nmcxruznRVeV62",
  database: "tvgpr",
  connectionLimit: 10, // número máximo de conexões simultâneas
  connectTimeout: 10000, // opcional: tempo máximo pra conectar (ms)
  acquireTimeout: 10000, // opcional: tempo máximo pra conseguir conexão
});

module.exports = { pool };
