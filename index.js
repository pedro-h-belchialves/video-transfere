const { getVideos, getVideosTransfered } = require("./repositories/video.js");
const queue = require("./queue/job.js");

require("dotenv").config();

const main = async () => {
  const args = process.argv.slice(2);
  const options = {};

  console.log(args[0]);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    options[key] = value;
  }

  const limit = parseInt(options.limit);
  const offset = parseInt(options.offset || "0");

  console.log(await getVideosTransfered());

  // console.log("limit", limit);
  // console.log("offset", offset);

  const videos = await getVideos(limit, offset);

  getDutationAvarege(videos);

  for (const video of videos) {
    console.log("send to queue", video.id);
    await queue.add("transfere-videos", { videoUrl: video.link });
  }

  return;
};

function getDutationAvarege(videos) {
  let sum = 0;
  for (const video of videos) {
    sum += video.duration;
  }
  console.log(`Media da duração: ${sum / videos.length}`);
}

main();
