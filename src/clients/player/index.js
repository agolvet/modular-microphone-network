import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';

import createLayout from './layout.js';

import pluginPlatformInit from '@soundworks/plugin-platform-init/client.js'

import '@ircam/simple-components/sc-signal.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

/**
 * Grab the configuration object written by the server in the `index.html`
 */
const config = window.SOUNDWORKS_CONFIG;

/**
 * If multiple clients are emulated you might to want to share some resources
 */
const audioContext = new AudioContext();
const streamBufferSize = 512;
const streamBufferDuration = streamBufferSize/audioContext.sampleRate * 1000;
const analysisBufferSize = 128;
const analysisBufferDuration = analysisBufferSize / audioContext.sampleRate * 1000;


async function main($container) {
  /**
   * Create the soundworks client
   */
  const client = new Client(config);

  /**
   * Register some soundworks plugins, you will need to install the plugins
   * before hand (run `npx soundworks` for help)
   */
  // client.pluginManager.register('my-plugin', plugin);
  client.pluginManager.register('platform-init', pluginPlatformInit, {audioContext});

  /**
   * Register the soundworks client into the launcher
   *
   * The launcher will do a bunch of stuff for you:
   * - Display default initialization screens. If you want to change the provided
   * initialization screens, you can import all the helpers directly in your
   * application by doing `npx soundworks --eject-helpers`. You can also
   * customise some global syles variables (background-color, text color etc.)
   * in `src/clients/components/css/app.scss`.
   * You can also change the default language of the intialization screen by
   * setting, the `launcher.language` property, e.g.:
   * `launcher.language = 'fr'`
   * - By default the launcher automatically reloads the client when the socket
   * closes or when the page is hidden. Such behavior can be quite important in
   * performance situation where you don't want some phone getting stuck making
   * noise without having any way left to stop it... Also be aware that a page
   * in a background tab will have all its timers (setTimeout, etc.) put in very
   * low priority, messing any scheduled events.
   */
  launcher.register(client, { initScreensContainer: $container });

  /**
   * Launch application
   */
  await client.start();

  // The `$layout` is provided as a convenience and is not required by soundworks,
  // its full source code is located in the `./views/layout.js` file, so feel free
  // to edit it to match your needs or even to delete it.
  const $layout = createLayout(client, $container);

  const playerState = await client.stateManager.create('player');

  client.stateManager.observe(async (schemaName, stateId) => {
    if (schemaName === 'player') {
      const state = await client.stateManager.attach(schemaName, stateId);
      const name = state.get('name');
      if (name === 'thing') {
        state.onUpdate(updates => {
          if ('vizData' in updates) {
            const $signal = $layout.querySelector('#sc-signal');
            const vizData = updates.vizData;
            const vizBlock = new Float32Array(2);
            vizBlock[0] = vizData.min;
            vizBlock[1] = vizData.max;
            if ($signal) {
              $signal.value = { time: vizData.time, data: Array.from(vizBlock) }
            }
          }
        });
      }
    } 
  })

  // Get access to microphone
  const microphoneStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false, 
      noiseReduction: false, 
      autoGainControl: false,
    }, 
    video: false
  });

  const streamSource = new MediaStreamAudioSourceNode(audioContext, {
    mediaStream: microphoneStream,
  });

  // let baseFreq = 220

  // const oscBase = new OscillatorNode(audioContext);
  // oscBase.frequency.value = baseFreq;

  // const oscBeat = new OscillatorNode(audioContext);
  // oscBeat.frequency.value = baseFreq;

  // oscBase.connect(audioContext.destination);
  // oscBeat.connect(audioContext.destination);
  // oscBase.start();
  // oscBeat.start();

  // const scriptProcessor = audioContext.createScriptProcessor(streamBufferSize, 1, 0);
  // streamSource.connect(scriptProcessor);

  // scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
  //   const now = audioContext.currentTime;
  //   const $signal = $layout.querySelector('#sc-signal');
  //   const channelData = audioProcessingEvent.inputBuffer.getChannelData(0);
  //   const vizBlock = new Float32Array(2);
  //   for (let i = 0; i < 4; i++) {
  //     let min = 1;
  //     let max = -1;
  //     for (let j = 0; j < analysisBufferSize; j++) {
  //       const val = channelData[j + i * analysisBufferSize];
  //       min = Math.min(min, val);
  //       max = Math.max(max, val);
  //     }

  //     vizBlock[0] = min;
  //     vizBlock[1] = max;
  //     if ($signal) {
  //       $signal.value = { time: now + i*analysisBufferDuration, data: Array.from(vizBlock) }
  //     }
  //   }
  // }



  
}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
