import { v2 } from "@google-cloud/dialogflow";

const projectId = process.env.GCP_PROJECT_ID;

const sessionClient = new v2.SessionsClient({
  projectId,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/gm, "\n"),
  },
});

// Takes in a session id, input audio, and sample rate of the input audio
export const detectIntent = async (sessionId, inputAudio, sampleRate) => {
  // Create a session path based on the session id
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  // Send the audio to Dialogflow for intent detection and extract the response using JS Destructuring
  const [response] = await sessionClient.detectIntent({
    // The session path to send the audio to
    session: sessionPath,
    // The query we want to send to Dialogflow
    queryInput: {
      // Configuration of the audio to send to Dialogflow
      audioConfig: {
        // Encoding of the audio we want to send to Dialogflow. We chose AUDIO_ENCODING_UNSPECIFIED because different browsers will use different encodings.
        audioEncoding: "AUDIO_ENCODING_UNSPECIFIED",
        /**
         * Sample rate of the audio
         *
         * Supported sample rates for .ogg/.oga, webm, flac
         * 8000, 12000, 16000, 24000, 48000;
         */
        sampleRateHertz: sampleRate ?? 48000,
        languageCode: "en-US",
      },
    },
    // The actual audio as a base64 encoded string
    inputAudio,
  });

  const result = response.queryResult;

  return result;
};

export const detectTextIntent = async (sessionId) => {
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  const [response] = await sessionClient.detectIntent({
    session: sessionPath,
    queryInput: {
      text: {
        languageCode: "en-us",
        text: "pause video",
      },
    },
  });

  const result = response.queryResult;

  return result;
};
