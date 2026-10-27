/*
 * Vendored from mainnet-js 2.7.34 and @mainnet-cash/contract 2.7.34, both MIT,
 * https://github.com/mainnet-cash/mainnet-js
 *
 * - DELIMITER: mainnet-js dist/module/constant.js
 * - atob: mainnet-js dist/module/util/base64.js
 * - castConstructorParametersFromArtifact: @mainnet-cash/contract dist/module/util.js
 * - contractIdParameters: the parameter lines of Contract.fromId, @mainnet-cash/contract
 *   dist/module/Contract.js, with the artifact passed in where fromId compiled one
 *
 * Why: TapToPay only read the constructor parameters of a contract id, but Contract.fromId
 * compiled the CashScript source the id embeds with cashc on every call to get there. Reading
 * them needs only these lines and the artifact the app already ships. The package ended with
 * mainnet-js v2: mainnet-js 3.0.0 removed it.
 *
 * Changes from the source: the libauth import names Paytaca's libauth 3 (bitauth-libauth-v3),
 * and contractIdParameters is new around the fromId lines; the rest is verbatim.
 */
import { base64ToBin, hexToBin, isBase64 } from "bitauth-libauth-v3";

export const DELIMITER = ":";

export function atob(data) {
    if (!isBase64(data)) {
        throw new Error("Provided data is not a valid base64");
    }
    return String.fromCharCode(...base64ToBin(data));
}

/**
 * castConstructorParametersFromArtifact - Cast string arguments to the appropriate cashscript contract constructor input
 *
 * low-level utility function
 *
 * @param parameters String arguments to construct inputs from
 * @param inputs The name and type of required arguments for the transaction constructor
 * @returns A list of constructor parameters
 */
export function castConstructorParametersFromArtifact(parameters, artifact) {
    const result = [];
    const inputs = artifact.constructorInputs;
    parameters.forEach(function (value, i) {
        if (inputs[i].type.startsWith("bytes")) {
            if (typeof value === "string") {
                let uint;
                if (value.includes(",")) {
                    uint = Uint8Array.from(value.split(",").map((vStr) => parseInt(vStr)));
                }
                else {
                    uint = hexToBin(value);
                }
                result.push(uint);
            }
            else {
                throw Error(`Couldn't parse ${value} from string to bytes`);
            }
        }
        else if (inputs[i].type === "int") {
            result.push(BigInt(value));
        }
        else if (inputs[i].type === "boolean") {
            result.push(Boolean(value));
        }
        else {
            result.push(value);
        }
    });
    return result;
}

/**
 * The constructor parameters of a contract id as @mainnet-cash/contract wrote it,
 * contract:<network>:<parameters>:<source>:<nonce>, cast by the contract's artifact.
 */
export function contractIdParameters(contractId, artifact) {
    const serializedParams = contractId.split(DELIMITER)[2];
    const paramStrings = atob(serializedParams)
        .split(DELIMITER)
        .map((s) => atob(s));
    return castConstructorParametersFromArtifact(paramStrings, artifact);
}
