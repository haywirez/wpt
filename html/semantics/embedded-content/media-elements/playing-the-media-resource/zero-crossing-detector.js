function zeroCrossingRate(array) {
  var zcr = 0;
  for (var i = 0; i < array.length; i++) {
    if (
      (array[i] >= 0 && array[i + 1] < 0) ||
      (array[i] < 0 && array[i + 1] >= 0)
    ) {
      zcr++;
    }
  }
  return zcr;
}

class ZeroCrossingRateDetector extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    // buffer has to be long enough to handle
    // a zero crossing rate corresponding to a 20 Hz sine
    // we add an extra samples at the end
    this.threshold = (1 / 20) * 44100 + 1;
    this.pull = false;
    this.port.onmessage = e => {
      switch (e.data.type) {
        default:
          // start pulling data into buffer
          console.log("audioworklet thread received message", e.data);
          this.pull = true;
      }
    };
  }

  calculateFrequency = () =>
    (zeroCrossingRate(this.buffer) / this.buffer.length / 2) * 44100;

  async send() {
    console.log("buffer data", this.buffer);
    const freq = this.calculateFrequency();
    console.log(`calculated freq: ${freq} Hz, sending`);
    this.port.postMessage(freq);
  }

  process(inputs, outputs, parameters) {
    let input = inputs[0][0];
    let output = outputs[0][0];
    if (input.length > 0) {
      for (let k = 0; k < input.length; ++k) {
        output[k] = input[k];
        if (this.pull) {
          this.buffer.push(input[k]);
          if (this.buffer.length >= this.threshold) {
            // flush, stop pulling data, reset
            this.send();
            this.pull = false;
            this.buffer = [];
          }
        }
      }
    } else {
      output.fill(0);
    }

    return true;
  }
}

registerProcessor("zero-crossing-detector", ZeroCrossingRateDetector);
