// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { handleCloudinaryUpload } from "../../lib/cloudinary";
import { parseForm } from "../../lib/files";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  switch (req.method) {
    case "POST": {
      try {
        const result = await handlePostRequest(req);

        return res.status(200).json({ message: "Success", result });
      } catch (error) {
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

  const result = await handleCloudinaryUpload(data?.files?.file);

  return result;
};
