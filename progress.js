const {
  getTranscodedVideos,
  updateVideoToOldUrl,
} = require("./repositories/video.js");
const axios = require("axios");

const STREAM_BASE_URL = "http://168.195.12.29:5500";
const ACCESS_KEY = "5806e3cc-754f-4a42-9c45-dbcef2507322";

// Requisição para o arquivo .m3u8 do vídeo
async function checkVideoStream(videoId) {
  try {
    const { data } = await axios.get(
      `${STREAM_BASE_URL}/video-volumes/${videoId}/1920x1080_out.m3u8`,
      {
        responseType: "text",
        timeout: 5000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
        },
      }
    );
    return data.includes("1920");
  } catch (error) {
    return false;
  }
}

// Verifica se vídeo ainda está na API de streaming
async function isVideoInDb(videoId) {
  try {
    const { data } = await axios.get(
      `${STREAM_BASE_URL}/videos?id=${videoId}`,
      {
        headers: { access_key: ACCESS_KEY },
      }
    );
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error(
      `Erro ao verificar DB para vídeo ${videoId}: ${error.message}`
    );
    return false;
  }
}

async function progress() {
  const videos = await getTranscodedVideos();

  let errors = 0;
  let working = 0;
  let stillInDb = 0;

  console.log(`Iniciando verificação de ${videos.length} vídeos...\n`);

  for (const video of videos) {
    const videoId = video.id;

    const isStreamValid = await checkVideoStream(videoId);

    if (isStreamValid) {
      const stillExists = await isVideoInDb(videoId);

      if (!stillExists) {
        console.log(
          `⚠️ Vídeo ${videoId} com stream OK mas não encontrado no DB`
        );
      }

      working++;

      // ⚠️ Descomente se quiser atualizar o link no banco
      // await updateVideoToOldUrl(videoId, `${STREAM_BASE_URL}/video-volumes/${videoId}/master.m3u8`);
    } else {
      await removeCorruptedVideos(videoId);
      const stillExists = await isVideoInDb(videoId);

      if (stillExists) {
        stillInDb++;

        // ⚠️ Descomente se quiser excluir do DB
        const videoData = await axios.get(
          `${STREAM_BASE_URL}/videos?id=${videoId}`,
          {
            headers: { access_key: ACCESS_KEY },
          }
        );
        if (videoData.length > 0) {
          await removeCorruptedVideos(videoId);
        }
      }

      errors++;

      console.warn(`❌ Vídeo ${videoId} com erro de stream`);
    }
  }

  async function removeCorruptedVideos(videoId) {}

  console.log("\n Resultado da análise:");
  console.log("✅ Vídeos funcionando:", working);
  console.log("❌ Vídeos com erro:", errors);
  console.log("⚠️ Vídeos ainda no DB:", stillInDb);
}

progress();
