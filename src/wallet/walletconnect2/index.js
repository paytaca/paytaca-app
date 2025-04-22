import {
  SigningSerializationFlag,
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  binToHex,
  decodePrivateKeyWif,
  encodeTransaction,
  generateSigningSerializationBCH,
  generateTransaction,
  hash256,
  hexToBin,
  importAuthenticationTemplate,
  lockingBytecodeToCashAddress,
  secp256k1,
  sha256
} from '@bitauth/libauth'
import { Core } from '@walletconnect/core'
import { WalletKit /*, type IWalletKit */ } from '@reown/walletkit'
import { parseExtendedJson, privateKeyToCashAddress, signBchTxError, unpackSourceOutput } from './tx-sign-utils'
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS()

/**
 * @returns IWalletKit
 */
export async function initWeb3Wallet () {
  const core = new Core({
    projectId: process.env.WALLETCONNECT_PROJECT_ID
  })

  return await WalletKit.init({
    core: core,
    metadata: {
      name: 'Paytaca',
      description: 'Paytaca - BCH Wallet App',
      url: 'https://www.paytaca.com',
      icons: ['https://walletconnect.org/walletconnect-logo.png'],
    }
  })
}


export async function resetWallectConnectDatabase() {
  const request = indexedDB.open('WALLET_CONNECT_V2_INDEXED_DB');

  request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
  };

  request.onsuccess = (event) => {
      const db = event.target.result;

      db.objectStoreNames.forEach((storeName) => {
          const transaction = db.transaction(storeName, "readwrite");
          const objectStore = transaction.objectStore(storeName);

          const getAllKeysRequest = objectStore.getAllKeys();

          getAllKeysRequest.onsuccess = () => {
              const keys = getAllKeysRequest.result;

              keys.forEach((key) => {
                  const getRequest = objectStore.get(key);

                  getRequest.onsuccess = () => {
                      let record = getRequest.result;

                      if (record && typeof record === "object") {
                          // Create a clone to avoid modifying the original
                          const clonedRecord = JSON.parse(JSON.stringify(record));

                          // Set all properties of the cloned record to empty strings
                          Object.keys(clonedRecord).forEach((prop) => {
                              clonedRecord[prop] = "";
                          });

                          const updateRequest = objectStore.put(clonedRecord, key);
                          updateRequest.onerror = (err) => {
                              console.error(`Failed to update key ${key}:`, err.target.error);
                          };
                          updateRequest.onsuccess = () => {
                              console.log(`Key ${key} updated successfully.`);
                          };
                      } else {
                          // If the value is not an object, simply replace it with an empty string
                          const updateRequest = objectStore.put("", key);
                          updateRequest.onerror = (err) => {
                              console.error(`Failed to update key ${key}:`, err.target.error);
                          };
                          updateRequest.onsuccess = () => {
                              console.log(`Key ${key} updated successfully.`);
                          };
                      }
                  };

                  getRequest.onerror = () => {
                      console.error(`Failed to retrieve key ${key}.`);
                  };
              });
          };

          getAllKeysRequest.onerror = () => {
              console.error("Failed to retrieve keys from the object store.");
          };
      });
  };

  request.onupgradeneeded = () => {
      console.error(
          "The database requires an upgrade, no existing keys can be updated."
      );
  };
}

export function parseSessionRequest(sessionRequest) {
  const parsedSessionRequest = parseExtendedJson(JSON.stringify(sessionRequest))
  if (parsedSessionRequest?.params?.request?.method === 'bch_signTransaction') {
    const parsedParams = parsedSessionRequest.params.request.params
    const parsedTx = parsedParams?.transaction

    const populateOutputAddress = output => {
      if (output?.lockingBytecode) {
        const parseResp = lockingBytecodeToCashAddress(
          output?.lockingBytecode,
          undefined,
          { tokenSupport: Boolean(output?.token) },
        )
        if (typeof parseResp === 'string') output.address = parseResp
      }
      return output
    }

    parsedTx?.outputs?.forEach?.(populateOutputAddress)
    parsedParams?.sourceOutputs?.forEach?.(populateOutputAddress)?.forEach(unpackSourceOutput)

    parsedTx?.inputs?.forEach?.(input => {
      input.sourceOutput = parsedParams?.sourceOutputs?.find?.(output => {
        return binToHex(input?.outpointTransactionHash) == binToHex(output?.outpointTransactionHash) &&
          input?.outpointIndex == output?.outpointIndex
      })
    })

    parsedSessionRequest.params.request.params = parsedParams
  }

  return parsedSessionRequest
}

export async function signMessage(message, wif='') {
  const signatureBase64 = bchjs.BitcoinCash.signMessageWithPrivKey(wif, message)
  return Buffer.from(signatureBase64, 'base64').toString('hex')
}

export async function signBchTransaction(transaction, sourceOutputsUnpacked, wif='') {
  const template = importAuthenticationTemplate(authenticationTemplateP2pkhNonHd);
  const compiler = authenticationTemplateToCompilerBCH(template);

  const decodedPrivkey = decodePrivateKeyWif(wif)
  if (typeof decodedPrivkey === 'string') {
    throw signBchTxError('Not enough information provided, please include contract redeemScript')
  }

  const privateKey = decodedPrivkey.privateKey;
  const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(decodedPrivkey.privateKey)
  if (typeof pubkeyCompressed === 'string') throw signBchTxError(pubkeyCompressed)
  const signingAddress = privateKeyToCashAddress(privateKey)

  const txTemplate = {...transaction}
  for (const index in txTemplate.inputs) {
    const input = txTemplate.inputs[index]
    const sourceOutput = input?.sourceOutput

    if (sourceOutput?.contract?.artifact?.contractName) {
      let unlockingBytecodeHex = binToHex(sourceOutput?.unlockingBytecode);
      const sigPlaceholder = "41" + binToHex(Uint8Array.from(Array(65)));
      const pubkeyPlaceholder = "21" + binToHex(Uint8Array.from(Array(33)));
      if (unlockingBytecodeHex.indexOf(sigPlaceholder) !== -1) {
        // compute the signature argument
        const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId;
        const context = { inputIndex: index, sourceOutputs: sourceOutputsUnpacked, transaction: transaction };
        const signingSerializationType = new Uint8Array([hashType]);

        const coveredBytecode = sourceOutputsUnpacked[index].contract?.redeemScript;
        if (!coveredBytecode) {
          throw signBchTxError('Not enough information provided, please include contract redeemScript');
        }
        const sighashPreimage = generateSigningSerializationBCH(context, { coveredBytecode, signingSerializationType });
        const sighash = hash256(sighashPreimage);
        const signature = secp256k1.signMessageHashSchnorr(privateKey, sighash);
        if (typeof signature === 'string') throw signBchTxError(signature);
        const sig = Uint8Array.from([...signature, hashType]);

        unlockingBytecodeHex = unlockingBytecodeHex.replace(sigPlaceholder, "41" + binToHex(sig));
      }

      if (unlockingBytecodeHex.indexOf(pubkeyPlaceholder) !== -1) {
        unlockingBytecodeHex = unlockingBytecodeHex.replace(pubkeyPlaceholder, "21" + binToHex(pubkeyCompressed));
      }

      input.unlockingBytecode = hexToBin(unlockingBytecodeHex);
    } else {
      if (!sourceOutput?.unlockingBytecode?.length && lockingBytecodeToCashAddress(sourceOutput.lockingBytecode) === signingAddress) {
        input.unlockingBytecode = {
          compiler,
          data: {
            keys: { privateKeys: { key: privateKey } },
          },
          valueSatoshis: sourceOutput.valueSatoshis,
          script: "unlock",
          token: sourceOutput.token,
        }
      }
    }
  }

  console.log(txTemplate)

  const generated = generateTransaction(txTemplate);
  if (!generated.success) {
    throw signBchTxError(JSON.stringify(generated.errors, null, 2));
  }
  const encoded = encodeTransaction(generated.transaction);
  const hash = binToHex(sha256.hash(sha256.hash(encoded)).reverse());
  return { signedTransaction: binToHex(encoded), signedTransactionHash: hash }
}

export const sessionRequestsExample = [
  {
      "id": 1696568739152409,
      "topic": "636a5c44e87dfa3bef15a223d5145a4bc9326f19239f8346622e72b8d1854065",
      "params": {
          "request": {
              "method": "bch_signMessage",
              "params": {
                "account": "bitcoincash:qq4sh33hxw2v23g2hwmcp369tany3x73wugtc9p69g",
                "message": "Test message",
              }
          },
          "chainId": "bch:bitcoincash"
      },
      "verifyContext": {
          "verified": {
              "verifyUrl": "https://verify.walletconnect.com",
              "validation": "UNKNOWN",
              "origin": "https://tapswap.cash/"
          }
      }
  },
  {
    "id": 1696572317609411,
    "topic": "3874acf632e521460d77b8ab7bc790e27d83686fb6cf867d2317c0c6819c7a1a",
    "params": {
        "request": {
            "method": "bch_signTransaction",
            "params": {
                "transaction": {
                    "inputs": [
                        {
                            "outpointIndex": 1,
                            "outpointTransactionHash": "<Uint8Array: 0x9eb5b4ae1d15e85d9e3d40036dd46424df203b4be3fb434077ff861509186499>",
                            "sequenceNumber": 0,
                            "unlockingBytecode": "<Uint8Array: 0x>"
                        },
                        {
                            "outpointIndex": 1,
                            "outpointTransactionHash": "<Uint8Array: 0xfa2f80f3c6d64359c87594d8303f9a621caf2623792ef6890797c68db7621675>",
                            "sequenceNumber": 0,
                            "unlockingBytecode": "<Uint8Array: 0x>"
                        }
                    ],
                    "locktime": 0,
                    "outputs": [
                        {
                            "lockingBytecode": "<Uint8Array: 0xa914b3195980e2a1978f32e2e1f683df10ef09b0936f87>",
                            "token": {
                                "amount": "<bigint: 0n>",
                                "category": "<Uint8Array: 0x0115cba92eb3a79c9ed3c8a81f24909a78f5af25c80d13c1553d318f2a870f6d>",
                                "nft": {
                                    "capability": "none",
                                    "commitment": "<Uint8Array: 0x5593401c8a0100000000000000000000000000003c570a0000000000000000000000000000000000>"
                                }
                            },
                            "valueSatoshis": "<bigint: 1000n>"
                        },
                        {
                            "lockingBytecode": "<Uint8Array: 0x6a044d5053570104043d400caf14e4da17ddbe40533c2a8638fdedf2c0997d46e9530480f0fa02000000142b0bc6373394c5450abbb780c7455f66489bd1770360e316>",
                            "valueSatoshis": "<bigint: 0n>"
                        },
                        {
                            "lockingBytecode": "<Uint8Array: 0x76a9142b0bc6373394c5450abbb780c7455f66489bd17788ac>",
                            "valueSatoshis": "<bigint: 122857n>"
                        }
                    ],
                    "version": 2
                },
                "sourceOutputs": [
                    {
                        "outpointIndex": 1,
                        "outpointTransactionHash": "<Uint8Array: 0x9eb5b4ae1d15e85d9e3d40036dd46424df203b4be3fb434077ff861509186499>",
                        "sequenceNumber": 0,
                        "unlockingBytecode": "<Uint8Array: 0x>",
                        "lockingBytecode": "<Uint8Array: 0x76a9142b0bc6373394c5450abbb780c7455f66489bd17788ac>",
                        "valueSatoshis": "<bigint: 1000n>",
                        "token": {
                            "amount": "<bigint: 0n>",
                            "category": "<Uint8Array: 0x0115cba92eb3a79c9ed3c8a81f24909a78f5af25c80d13c1553d318f2a870f6d>",
                            "nft": {
                                "capability": "none",
                                "commitment": "<Uint8Array: 0x5593401c8a0100000000000000000000000000003c570a0000000000000000000000000000000000>"
                            }
                        }
                    },
                    {
                        "outpointIndex": 1,
                        "outpointTransactionHash": "<Uint8Array: 0xfa2f80f3c6d64359c87594d8303f9a621caf2623792ef6890797c68db7621675>",
                        "sequenceNumber": 0,
                        "unlockingBytecode": "<Uint8Array: 0x>",
                        "lockingBytecode": "<Uint8Array: 0x76a9142b0bc6373394c5450abbb780c7455f66489bd17788ac>",
                        "valueSatoshis": "<bigint: 123389n>"
                    }
                ],
                "broadcast": false,
                "userPrompt": "Sign to create a sell order"
            }
        },
        "chainId": "bch:bitcoincash"
    },
    "verifyContext": {
        "verified": {
            "verifyUrl": "https://verify.walletconnect.com",
            "validation": "UNKNOWN",
            "origin": "https://tapswap.cash/"
        }
    }
}
]
