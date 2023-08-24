import ytdl from "ytdl-core";
import "isomorphic-fetch";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";
import { error, Router } from "itty-router";
import CustomResponse from "./CustomResponse.js";
import JsResponse from "./JsResponse.js";
const router = Router();

router
  .get("/", () => {
    return new JsResponse("Success!");
  })
  .get("/ytdl?", async (req, env) => {
    const { query } = req;
    const url = decodeURIComponent(query.url);
    const filter = query.filter;
    const chunks = [];
    if (url && filter) {
      const yt = ytdl(url, {filter: filter, quality: "highest"});
      const streamToArrayBuffer = (yt) => {
        return new Promise((resolve, reject) => {
          yt.on("data", chunk => {
            chunks.push(chunk);
          });
          yt.on("end", () => {
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const arrayBuffer = new ArrayBuffer(totalLength);
            const view = new Uint8Array(arrayBuffer);
            let offset = 0;
            chunks.forEach(chunk => {
              view.set(chunk, offset);
              offset += chunk.length;
            });
            resolve(arrayBuffer);
            console.log("buffer enviado");
          });
          yt.on("error", reject);
        });
      };
      const ab = await streamToArrayBuffer(yt);
      const type = filter == "audioonly" ? "audio/mp3" : "video/mp4";
      return new CustomResponse(ab, {type: type});
    } else {
      return new JsResponse({error: "Some query is missing"});
    }
  })
  .get("/yt-info", async (req, env) => {
    const { query } = req;
    const url = decodeURIComponent(query.url);
    const ytInfo = await ytdl.getInfo(url);
    const videoTitle = ytInfo.videoDetails.title;
    const duration = ytInfo.videoDetails.lengthSeconds;
    const short_url = "https://youtu.be/" + ytInfo.videoDetails.videoId;
    return new JsResponse({
      caption: videoTitle,
      duration: duration,
      short_url: short_url
    });
  })
  .all("*", () => new JsResponse({status:404, message:"Not Found"}));

const ittyServer = createServerAdapter(
  (request, env, ctx) => router
    .handle(request, env, ctx)
    .catch(error)
);
const httpServer = createServer(ittyServer);
httpServer.listen(3001);
const keep = () => {
  console.log("keep");
};
setInterval(keep, 120000);