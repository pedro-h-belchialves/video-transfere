const { Worker } = require("bullmq");
const { connection } = require("./redis-connection.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const FormData = require("form-data");
const {
  updateVideo,
  updateVideoDescription,
} = require("../repositories/video.js");
require("dotenv").config();

ffmpeg.setFfmpegPath(ffmpegPath);

new Worker(
  "transfere-videos",
  async (job) => {
    Logger.log("start");
    const { videoUrl } = job.data;
    try {
      const match = videoUrl.match(/\/([a-f0-9-]+)\.m3u8$/);
      if (!match) {
        Logger.error("Error: Invalid video URL");
        return;
      }

      const videoId = match[1];
      const baseDir = videoUrl.split("/").slice(0, -1).join("/");
      const tmpDir = path.resolve(__dirname, "..", "tmp", videoId);

      if (!videoUrl) {
        Logger.error("Error: Invalid video URL");
        return;
      }

      Logger.log(`start for ${videoId}`);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const masterUrl = `${baseDir}/${videoId}.m3u8`;
      const m3u8Path = path.join(tmpDir, `${videoId}.m3u8`);
      const outputPath = path.join(tmpDir, `${videoId}.mp4`);

      Logger.log(`Downloading:  ${masterUrl}`);

      let masterM3U8;

      try {
        const timeout = setTimeout(async () => {
          Logger.error(`Error: Master playlist not found`);
          await updateVideoDescription(videoId, "invalid");

          fs.readdirSync(tmpDir).forEach((file) =>
            fs.unlinkSync(path.join(tmpDir, file), { force: true })
          );
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }, 15000);

        const { data } = await axios.get(masterUrl, {
          timeout: 5000,
          responseType: "text",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
          },
        });

        if (data) clearTimeout(timeout);
        masterM3U8 = data;
      } catch (e) {
        Logger.error(`Error: No master playlist found`);
        throw new Error("Error: No master playlist found");
      }

      const lines = masterM3U8
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const resolutionPlaylist = lines.filter((l) => l.endsWith(".m3u8")).pop();
      if (!resolutionPlaylist)
        throw new Error("Error: No resolution playlist found");

      const fullResUrl = `${baseDir}/${resolutionPlaylist}`;
      Logger.log(`Downloading resolutions... `);

      const { data: resM3U8Content } = await axios.get(fullResUrl);

      const fixedResM3U8 = resM3U8Content
        .split("\n")
        .map((line) => {
          if (line.trim().length === 0 || line.startsWith("#")) return line;
          return line.split("/").pop();
        })
        .join("\n");

      fs.writeFileSync(m3u8Path, fixedResM3U8);

      const tsDir = path.dirname(m3u8Path);

      const tsFiles = fixedResM3U8
        .split("\n")
        .filter((l) => l && !l.startsWith("#"));
      for (const tsFile of tsFiles) {
        Logger.log(`Downloading resolution: ${tsFile}`);
        const tsUrl = `${baseDir}/${tsFile}`;
        const tsPath = path.join(tsDir, tsFile);
        const res = await axios.get(tsUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(tsPath, res.data);
      }

      Logger.log(`Converting to mp4...`);
      await new Promise((resolve, reject) => {
        ffmpeg(m3u8Path)
          .inputOptions([
            "-protocol_whitelist",
            "file,http,https,tcp,tls",
            "-allowed_extensions",
            "ALL",
          ])
          .outputOptions("-c copy")
          .on("end", () => {
            Logger.log(`Downloads finished!`);
            resolve();
          })
          .on("error", (err) => {
            Logger.error(`Error:`, err.message);
            reject(err);
          })
          .save(outputPath);
      });

      new Promise(async (resolve, reject) => {
        const formData = new FormData();
        formData.append("video", fs.createReadStream(outputPath));
        formData.append("id", videoId);
        formData.append("title", videoId);

        const res = await axios.post(
          `${process.env.SETEAMING_URL}/videos`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              "access-key": process.env.STREAMIND_ACCESS_KEY,
            },
          }
        );

        if (res.data.video) {
          Logger.log(`Update video link on database...`);

          await updateVideo(
            videoId,
            `http://168.195.12.29:5500/video-volumes/` +
              res.data.video.id +
              "/master.m3u8"
          );
          Logger.log(`Deleting temp files...`);

          createUploadingVideoList(videoId);
          fs.readdirSync(tmpDir).forEach((file) =>
            fs.unlinkSync(path.join(tmpDir, file), { force: true })
          );
          fs.rmSync(tmpDir, { recursive: true, force: true });

          Logger.log(`Finished for ${videoId}! \n\n`);

          resolve();
        } else {
          Logger.error(`Error on streaming:`, res.statusText);
          reject(new Error("Error on streaming"));
        }
      });
    } catch (err) {
      logErrorToFile(videoId);
      Logger.error(`Error:`, err.message);
    }
  },
  {
    connection,
  }
);

class Logger {
  static error(msg) {
    console.error(`ERROR ${new Date().toLocaleString()} : ${msg}`);
  }

  static log(msg) {
    console.log(`INFO ${new Date().toLocaleString()} : ${msg}`);
  }
}

function logErrorToFile(videoId) {
  try {
    const filePath = path.resolve(__dirname, "..", "errors_log.tck");
    const logLine = `${videoId}\n`;
    fs.appendFileSync(filePath, logLine, "utf8");
  } catch (fileErr) {
    console.error("Erro ao escrever no arquivo de log de erros:", fileErr);
  }
}

function createUploadingVideoList(videoId) {
  const progressFile = path.resolve(__dirname, "..", "progress.txt");

  // 1. Cria o arquivo se ele não existe
  if (!fs.existsSync(progressFile)) {
    fs.writeFileSync(progressFile, JSON.stringify([]));
  }

  // 2. Lê o conteúdo atual do arquivo
  const fileContent = fs.readFileSync(progressFile, "utf-8");

  // 3. Faz o parse do conteúdo para um array
  let videoList = [];
  try {
    videoList = JSON.parse(fileContent);
  } catch (err) {
    // Se o conteúdo não for um array válido, recomeça com array vazio
    console.error("Erro ao fazer parse de progress.txt. Resetando arquivo.");
    videoList = [];
  }

  // 4. Adiciona o novo ID se ainda não estiver presente
  if (!videoList.includes(videoId)) {
    videoList.push(videoId);
  }

  // 5. Escreve de volta no arquivo
  fs.writeFileSync(progressFile, JSON.stringify(videoList, null, 2));
}
