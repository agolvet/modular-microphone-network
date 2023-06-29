class StreamAnalyzer extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(input, output, parameters) {
    return true;
  }
}

registerProcessor('stream-analyzer', StreamAnalyzer);