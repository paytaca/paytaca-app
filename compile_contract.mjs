import { compileFile } from 'cashscript';
import fs from 'fs';

const artifact = compileFile('../payment-hub/smart_contracts/recurring_payments.cash');
fs.writeFileSync('./recurring_payments_0_11_5.json', JSON.stringify(artifact, null, 2));
console.log("Compiled to recurring_payments_0_11_5.json");
