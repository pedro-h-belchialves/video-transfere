const { getVideos, getVideosTransfered } = require("./repositories/video.js");
const queue = require("./queue/job.js");

require("dotenv").config();

const main = async () => {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    options[key] = value;
  }

  const limit = parseInt(options.limit);
  const offset = parseInt(options.offset || "0");

  console.log(await getVideosTransfered());
  const videos = await getVideos(limit, offset);

  for (const video of videos) {
    console.log("send to queue", video.id);
    await queue.add("transfere-videos", { videoUrl: video.link });
  }

  return;
};

main();
