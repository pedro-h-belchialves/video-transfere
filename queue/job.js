const { Queue } = require("bullmq");
const { connection } = require("./redis-connection.js");

const queue = new Queue("transfere-videos", { connection: connection });

module.exports = queue;
