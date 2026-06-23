import { decodeCashAddress } from '@bitauth/libauth';

const addr = 'bchtest:qrmn29jueenmf9n5w554c9urzfjj5v3yeqff62a6vd';
const decoded = decodeCashAddress(addr);

console.log("Decoded Address payload hex:");
if (typeof decoded === 'string') {
  console.log(decoded);
} else {
  console.log(Buffer.from(decoded.payload).toString('hex'));
}
