const { connection } = require("../database/database.js");

const getVideos = (limit, offset) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM Video WHERE link NOT LIKE '%168.195%' AND description NOT LIKE 'invalid' ORDER BY duration ASC  LIMIT ${limit} OFFSET ${offset} `,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

const getVideosTransfered = () => {
  return new Promise((resolve, reject) => {
    let transfereds;
    let notTransfereds;
    connection.query(
      `SELECT * FROM Video WHERE link LIKE '%168.195%' `,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos:", err);
          return reject(err);
        }
        transfereds = results.length;
      }
    );

    connection.query(
      `SELECT * FROM Video WHERE link NOT LIKE '%168.195%' `,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos:", err);
          return reject(err);
        }
        notTransfereds = results.length;
      }
    );

    resolve(
      `videos transfered: ${transfereds}, videos not transfered: ${notTransfereds} total: ${
        transfereds + notTransfereds
      }`
    );
  });
};

const updateVideo = (videoId, newUrl) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE Video SET link = "${newUrl}", embedLink = "${newUrl}"  WHERE id = "${videoId}"`,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

const updateVideoDescription = (videoId, newUrl) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE Video SET description = "invalid" WHERE id = "${videoId}"`,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

// SET embedLink = "${newUrl}" SET fileLink = "${newUrl}"
module.exports = {
  getVideos,
  updateVideo,
  updateVideoDescription,
  getVideosTransfered,
};
