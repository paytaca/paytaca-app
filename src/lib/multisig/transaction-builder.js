import { encodeTransactionCommon } from "bitauth-libauth-v3"

export class TransactionBuilder {

  constructor() {
    this.inputs = []
    this.outputs = []
    this.locktime = 0
    this.version = 2
  }

  setLocktime (locktime) {
    this.locktime = locktime
    return this
  }

  addInput(input) {
    this.inputs.push(input)
    return this
  }

  addOutput(output) {
    this.outputs.push(output)
    return this
  }

  build() {
    const transaction = {
      inputs: this.inputs,
      outputs: this.outputs,
      version: this.version,
      locktime: this.locktime
    }

    const t = encodeTransactionCommon({ ...transaction })

    return binToHex(t)
  }
}