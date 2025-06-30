// video.js
const { pool } = require("../database/database.js");

const getVideos = (limit, offset) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT * 
        FROM Video 
        WHERE link NOT LIKE '%168.195%' 
          AND (description IS NULL OR description NOT LIKE '%invalid%')
        ORDER BY duration ASC  
        LIMIT ? OFFSET ?`,
      [limit, offset], // 🔒 evita SQL injection
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

const getTranscodedVideos = (limit, offset) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT * 
        FROM Video 
        WHERE link LIKE '%168.195%' 
        ORDER BY duration ASC  
`,
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

const getVideosTransfered = async () => {
  const transfereds = await new Promise((resolve, reject) => {
    pool.query(
      `SELECT COUNT(*) as count FROM Video WHERE link LIKE '%168.195%'`,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos transferidos:", err);
          return reject(err);
        }
        resolve(results[0].count);
      }
    );
  });

  const notTransfereds = await new Promise((resolve, reject) => {
    pool.query(
      `SELECT COUNT(*) as count FROM Video WHERE link NOT LIKE '%168.195%'`,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos não transferidos:", err);
          return reject(err);
        }
        resolve(results[0].count);
      }
    );
  });

  const corrupted = await new Promise((resolve, reject) => {
    pool.query(
      `SELECT COUNT(*) as count FROM Video WHERE description LIKE '%invalid%'`,
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar vídeos não transferidos:", err);
          return reject(err);
        }
        resolve(results[0].count);
      }
    );
  });

  return `Videos transferidos: ${transfereds}, não transferidos: ${notTransfereds}, corrompidos: ${corrupted}, total: ${
    transfereds + notTransfereds
  }`;
};

const updateVideo = (videoId, newUrl) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `UPDATE Video SET link = ?, embedLink = ? WHERE id = ?`,
      [newUrl, newUrl, videoId],
      (err, results) => {
        if (err) {
          console.error("Erro ao atualizar vídeo:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

const updateVideoToOldUrl = (videoId, newUrl) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `UPDATE Video SET link = ?, embedLink = ? WHERE id = ?`,
      [newUrl, newUrl, videoId],
      (err, results) => {
        if (err) {
          console.error("Erro ao atualizar vídeo:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

const updateVideoDescription = (videoId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `UPDATE Video SET description = 'invalid' WHERE id = ?`,
      [videoId],
      (err, results) => {
        if (err) {
          console.error("Erro ao atualizar descrição do vídeo:", err);
          return reject(err);
        }
        resolve(results);
      }
    );
  });
};

module.exports = {
  getVideos,
  updateVideo,
  updateVideoDescription,
  getVideosTransfered,
  getTranscodedVideos,
  updateVideoToOldUrl,
};
