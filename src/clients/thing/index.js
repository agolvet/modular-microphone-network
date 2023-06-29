import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';

import { loadConfig } from '../../utils/load-config.js';
import createLayout from './layout.js';

import { AudioContext, OscillatorNode, mediaDevices, MediaStreamAudioSourceNode, AnalyserNode } from 'node-web-audio-api';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const audioContext = new AudioContext();

const analysisBufferSize = 1024;
const analysisBlockSize = 128;
const blocksPerBuffer = Math.floor(analysisBufferSize / analysisBlockSize);

const analysisBuffer = new Float32Array(analysisBufferSize);


async function bootstrap() {
  /**
   * Load configuration from config files and create the soundworks client
   */
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);

  /**
   * Register some soundworks plugins, you will need to install the plugins
   * before hand (run `npx soundworks` for help)
   */
  // client.pluginManager.register('my-plugin', plugin);

  /**
   * Register the soundworks client into the launcher
   *
   * Automatically restarts the process when the socket closes or when an
   * uncaught error occurs in the program.
   */
  launcher.register(client);

  /**
   * Launch application
   */
  await client.start();

  // create application layout (which mimics the client-side API)
  const $layout = createLayout(client);

  // ...and do your own stuff!
  console.log('hello thing');

  const thingState = await client.stateManager.create('player', {name: 'thing'});

  const analyzer = new AnalyserNode(audioContext);

  const microphoneStream = await mediaDevices.getUserMedia({audio: true});

  const streamSource = new MediaStreamAudioSourceNode(audioContext, {
    mediaStream: microphoneStream,
  });
  streamSource.connect(analyzer);

  const getVizData = () => {
    analyzer.getFloatTimeDomainData(analysisBuffer);
    const now = audioContext.currentTime;
    const tDelta = analysisBlockSize/audioContext.sampleRate * 1000;

    for (let i = 0; i < blocksPerBuffer; i++) {
      let min = 1;
      let max = -1;

      for (let j = 0; j < analysisBlockSize; j++) {
        const val = analysisBuffer[j + i * analysisBlockSize];
        min = Math.min(min, val);
        max = Math.max(max, val);
      }

      thingState.set({
        vizData: {
          time: now + i * tDelta,
          min,
          max
        }
      });
    }

    setTimeout(getVizData, analysisBufferSize / audioContext.sampleRate * 1000);
  }
 
  getVizData();
}


// The launcher allows to fork multiple clients in the same terminal window
// by defining the `EMULATE` env process variable
// e.g. `EMULATE=10 npm run watch-process thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
