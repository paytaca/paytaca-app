import { Input, Output, TransactionBCH } from "@bitauth/libauth";
import { AbiFunction, Artifact } from 'cashscript';

export interface ContractInfo {
  contract?: {
    abiFunction: AbiFunction;
    redeemScript: Uint8Array;
    artifact: Partial<Artifact>;
  }
}

export interface ResponseInfo {
  eventResponseKey: string;
}

export interface OriginInfo {
  origin: string;
}

export interface AssetInfo {
  assetId?: string;
}

export type SourceOutput = Input | Output | ContractInfo;

export interface SignMessageOptions {
  assetId?: string;
  message: string;
  userPrompt?: string
}

export type SignMessageResponse = string;

export interface SignTransactionOptions {
  assetId?: string;
  transaction: string | TransactionBCH;
  sourceOutputs: SourceOutput[];
  broadcast?: boolean;
  userPrompt?: string
}

export interface SignTransactionResponse {
  signedTransaction: string;
  signedTransactionHash: string;
}
