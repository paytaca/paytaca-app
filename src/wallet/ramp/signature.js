import fs from 'fs'
import CryptoJS from 'crypto-js'
import ec from 'elliptic'
const { ec: EC } = ec
import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'

export async function signMessage (privateKeyWIF, message, timestamp) {
  const timedMessage = message + '::' + timestamp

  const privateKeyBin = decodePrivateKeyWif(privateKeyWIF).privateKey
  if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(privateKeyWIF))

  const messageHash = await sha256.hash(utf8ToBin(message))
  const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)

  if (typeof signatureBin === 'string') throw new Error(signatureBin)
  const signature = binToHex(signatureBin)

  return signature
}

async function generateContractHashSig (privateKey, filePath) {
  const hash = await calculateSHA256(filePath)
  const signature = generateECDSASig(privateKey, hash)

  console.log('Contract')
  console.log('   SHA-256 hash:', hash)
  console.log('   ECDSA signature: ', signature)
}

function generateECDSASig (privateKey, message) {
  const ec = new EC('secp256k1')
  const key = ec.keyFromPrivate(privateKey, 'hex')
  const signature = key.sign(message)
  const derSignature = signature.toDER('hex')
  return derSignature
}

async function calculateSHA256 (filePath) {
  const fileData = await readFile(filePath)
  const hash = CryptoJS.SHA256(fileData)
  const hex = hash.toString()
  return hex
}

function verifySignature (publicKeyHex, derSignatureHex, message) {
  const ec = new EC('secp256k1')

  // Load the public key from the hex representation
  const publicKey = ec.keyFromPublic(publicKeyHex, 'hex')

  // Verify the DER-encoded signature
  const isVerified = publicKey.verify(message, derSignatureHex, 'hex')
  console.log('isVerified: ', isVerified)
}

function readFile (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, fileData) => {
      if (error) {
        reject(error)
        return
      }
      resolve(fileData)
    })
  })
}
