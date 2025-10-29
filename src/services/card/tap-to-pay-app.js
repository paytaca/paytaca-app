import { compileFile } from 'cashc';
import {Contract, ElectrumNetworkProvider, TransactionBuilder} from 'cashscript';
import crypto from 'crypto';

const artifact = compileFile('./TapToPay-app.cash')

const ownerPkh = ""
const backendPkh = ""
const category = ""
const newBCV = generateBCV()

const args = [ownderPkh, backendPkh, category, newBCV]
const provider = new ElectrumNetworkProvider('mainnet')
const options = {provider, addressType: 'p2sh32'}
const contract = new Contract(artifact, args, options)

console.log("Contract address: ", contract.address)
console.log("Initial Balance: ", await contract.getBalance())

function generateBCV(){
    const buffer = crypto.randomBytes(4) // 32 bits
    return buffer.readUInt32BE(0) // convert to int
}

const newContractLockingBytecode = artifact.createLockingBytecode([
  ownerPkh,
  backendPkh,
  category,
  newBCV
]);

