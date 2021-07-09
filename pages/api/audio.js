// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { detectIntent } from "../../lib/dialogflow";
import { parseForm } from "../../lib/files";
import { promises as fs } from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  switch (req.method) {
    case "GET": {
      break;
    }
    case "POST": {
      try {
        const result = await handlePostRequest(req);

        return res.status(200).json({ message: "Success", result });
      } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Error", error });
      }
    }

    default: {
      return res.status(405).json({ message: "Method not allowed" });
    }
  }
}

const handlePostRequest = async (req) => {
  const data = await parseForm(req);

  const audioFile = await fs.readFile(data?.files?.file.path);
  const sessionId = data?.fields?.["sessionId"];
  const sampleRate = data?.fields?.["sampleRate"];

  return detectIntent(sessionId, audioFile.toString("base64"), sampleRate);
};
