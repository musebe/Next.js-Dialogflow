import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import { Duration } from "luxon";

export default function Home() {
  /**
   * Hook to store the html video element that will play the video
   * @type {React.RefObject<HTMLVideoElement>}
   */
  const videoElement = useRef(null);

  // Hook to store an instance of MediaRecorder
  const mediaRecorder = useRef(null);
  // Hook to store a unique session id to use with dialogflow
  const sessionId = useRef(null);
  // Hook to store the uploaded video's url
  const [video, setVideo] = useState("");
  /**
   * Holds the selected video file
   * @type {[File,Function]}
   */
  const [file, setFile] = useState(null);
  // Holds the loading state
  const [loading, setLoading] = useState(false);
  // Holds the recording state
  const [recording, setRecording] = useState(false);

  // Handles the results from making a detect intent call to dialogflow
  const handleDialogflowResults = useCallback((result) => {
    // Check if dialogflow was able to match any intent
    if (result.intent) {
      switch (result.intent.displayName) {
        // Check if the intent was "SeekVideo"
        case "SeekVideo": {
          // Get the parameters extracted from the intent
          const parameters = result.parameters.fields;

          // Get the point in time parameter
          const pointInTime =
            parameters.PointInTime[parameters.PointInTime.kind];

          // Get the duration parameter.
          const duration = parameters.duration[parameters.duration.kind];

          // Get the duration amount parameter. e.g. 10
          const durationAmount =
            duration.fields.amount[duration.fields.amount.kind];

          // Get the duration unit parameter. e.g. min
          const durationUnit = duration.fields.unit[duration.fields.unit.kind];

          // Convert the duration amount and unit to seconds
          const timeInSeconds = processDurationAsSeconds(
            durationAmount,
            durationUnit
          );

          // Check if the point in time is in the future or the past
          switch (pointInTime) {
            case "future": {
              // If the point in time is in the future, seek to the current time plus the duration
              videoElement.current.currentTime += timeInSeconds;

              break;
            }
            case "past": {
              // If the point in time is in the past, seek to the current time minus the duration
              videoElement.current.currentTime -= timeInSeconds;

              break;
            }
            default: {
              // If the point in time is not in the future or the past, assume we want to seek to the future
              videoElement.current.currentTime += timeInSeconds;

              break;
            }
          }
          break;
        }
        // Check if the intent was "PlayPauseStop"
        case "PlayPauseStop": {
          // Get the PlayStopPause parameter
          const playPauseStop = result.parameters.fields.PlayPauseStop;

          // Get the action parameter. Either "play","pause" or "stop"
          const action = playPauseStop[playPauseStop.kind];

          switch (action) {
            case "play": {
              // If the action is "play", play the video
              videoElement.current.play();
              break;
            }
            case "pause": {
              // If the action is "pause", pause the video
              videoElement.current.pause();
              break;
            }
            case "stop": {
              // If the action is "stop", stop the video
              videoElement.current.currentTime = 0;
              videoElement.current.pause();
              break;
            }
            default:
              break;
          }

          break;
        }

        default: {
          // TODO: Handle other intents
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Set the session id as a random string using a simple random string generator.
        sessionId.current = [...Array(20)]
          .map((i) => (~~(Math.random() * 36)).toString(36))
          .join("");

        // Check if the browser supports media recording
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Get the media stream. This will also request for the permission to use the microphone.
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });

          // Create a MediaRecorder instance using the stream as the media source.
          mediaRecorder.current = new MediaRecorder(stream);

          // This will hold the audio data
          let chunks = [];

          // Listen for the dataavailable event and push the data into the chunks array
          mediaRecorder.current.ondataavailable = function (e) {
            chunks.push(e.data);
          };

          // Listen for the recordingstopped event
          mediaRecorder.current.onstop = async (e) => {
            // Create a blob from the audio data with an encoding of audio/webm
            const blob = new Blob(chunks, { type: "audio/webm" });

            // Clean up the chunks array
            chunks = [];

            // Get the audio sample rate from the audio track
            const sampleRate = stream
              .getAudioTracks()[0]
              .getSettings().sampleRate;

            // Create a new form data object and append the blob, session id and sample rate to it
            const formData = new FormData();

            formData.append("file", blob);
            formData.append("sessionId", sessionId.current);
            formData.append("sampleRate", sampleRate);

            // Upload the audio by making a POST request to the /api/audio endpoint
            const response = await fetch("/api/audio", {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            // Check if the response was successful and delegate to the handleDialogflowResults function
            if (response.status >= 200 && response.status < 300) {
              handleDialogflowResults(data.result);
              return;
            }

            throw data;
          };
        } else {
          alert(
            "Your browser does not support the microphone or you do not have a microphone available"
          );
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [handleDialogflowResults]);

  const handleVideoUpload = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const formData = new FormData(e.target);

      const response = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.status >= 200 && response.status < 300) {
        setVideo(data.result.secure_url);
        return;
      }

      throw data;
    } catch (error) {
      // TODO: Show error message to user
      console.error({ ...error });
    } finally {
      setLoading(false);
    }
  };

  const processDurationAsSeconds = (time, unit) => {
    // Map dialogflow duration units to normal duration units that Luxon understands
    const units = {
      s: "seconds",
      min: "minutes",
      h: "hours",
    };

    const durationUnit = units[unit];

    const durationObject = {};

    durationObject[durationUnit] = time;

    // Create a Duration instance using the duration object
    const duration = Duration.fromObject(durationObject);

    // Return the duration in seconds
    return duration.as("seconds");
  };

  return (
    <div className="container">
      <Head>
        <title>Navigate Video using voice</title>
        <meta name="description" content="Navigate Video using voice" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header>
        <h1>Navigate Video using voice</h1>
      </header>
      <hr />
      <main>
        {!video && (
          <form onSubmit={handleVideoUpload}>
            <div className="upload-container">
              <label htmlFor="file-input">
                <p>Select Video</p>
              </label>
              <input
                type="file"
                name="file"
                accept=".mp4"
                id="file-input"
                required
                disabled={loading}
                multiple={false}
                onChange={(e) => {
                  const file = e.target.files[0];

                  setFile(file);
                }}
              />
            </div>
            {file && (
              <button type="submit" disabled={loading || !file}>
                Upload Video
              </button>
            )}
          </form>
        )}
        {video && (
          <div className="video-container">
            <video src={video} controls ref={videoElement}></video>
          </div>
        )}
        {video && (
          <div className="microphone-container">
            <p>
              <b>Hold</b> the button below or <b>double click</b> and hold if on
              a browser to begin recording. <b>Release</b> to stop recording.
            </p>
            <button
              onMouseDown={() => {
                console.log("mouse down");
                mediaRecorder.current?.start();
                setRecording(true);
              }}
              onMouseUp={() => {
                console.log("mouse up");
                mediaRecorder.current?.stop();
                setRecording(false);
              }}
            >
              {recording ? "Recording" : "Speak"}
            </button>
          </div>
        )}
      </main>
      <style jsx>{`
        .container {
          min-height: 100vh;
          max-width: 1000px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        header {
          height: 100px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #ffffff;
        }
        main .video-container video {
          width: 100%;
        }
        main form .upload-container {
          position: relative;
          background-color: #f1f1f1;
          min-width: 500px;
          min-height: 100px;
          border-radius: 2px;
          cursor: pointer;
          height: 300px;
        }
        main form .upload-container label {
          position: absolute;
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }
        main form .upload-container label p {
          padding: 16px;
          background-color: #1100ff;
          font-weight: bold;
          color: white;
          border-radius: 2px;
        }
        main form .upload-container input {
          opacity: 0;
          width: 0.1px;
          height: 0.1px;
          position: absolute;
        }

        button {
          height: 80px;
          width: 100%;
          font-weight: bold;
          margin: 8px auto;
        }

        button:hover {
          background-color: #1100ff;
          color: white;
          border: none;
        }
      `}</style>
    </div>
  );
}
