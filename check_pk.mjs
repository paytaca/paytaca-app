import { SignatureTemplate } from 'cashscript';
import { ripemd160, sha256 } from '@bitauth/libauth';

const wif = 'L31FkcDFJM6G6u6ijYfvbZLt3xhdjsKCjApZk5NjMm1GTnHUdfgR';
const sig = new SignatureTemplate(wif);
const pk = sig.getPublicKey();

const pkHash = ripemd160.hash(sha256.hash(pk));

console.log("Derived Public Key Hash:", Buffer.from(pkHash).toString('hex'));
console.log("Expected Recipient:", '041d80cdf7ebb86914b868824877a762f939de5b');
