import { IncomingForm, Fields, Files } from "formidable";

/**
 *
 * @param {*} req
 * @returns {Promise<{ fields:Fields; files:Files; }>}
 */
export const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true, multiples: true });

    form.parse(req, (error, fields, files) => {
      if (error) {
        return reject(error);
      }

      return resolve({ fields, files });
    });
  });
};
