import { installerScript } from "../lib/script.js";

export default function handler(request, response) {
  response.setHeader("Content-Type", "text/x-shellscript; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.status(200).send(installerScript());
}
