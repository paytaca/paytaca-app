
import { groupCosigners } from './utils'

const baseTemplate = {
  name: '',
  $schema: 'https://libauth.org/schemas/wallet-template-v0.schema.json',
  entities: {
    //   signer_1: createSigner('Signer 1', '1', ['1_and_2', '1_and_3']),
    //   signer_2: createSigner('Signer 2', '2', ['1_and_2', '2_and_3']),
    //   signer_3: createSigner('Signer 3', '3', ['1_and_3', '2_and_3']),
  },
  scripts: {
    //   '1_and_2': {
    //     name: 'Cosigner 1 & 2',
    //     script:
    //       'OP_0\n<key1.ecdsa_signature.all_outputs>\n<key2.ecdsa_signature.all_outputs>',
    //     unlocks: 'lock'
    //   },
    //   '1_and_3': {
    //     name: 'Cosigner 1 & 3',
    //     script:
    //       'OP_0\n<key1.ecdsa_signature.all_outputs>\n<key3.ecdsa_signature.all_outputs>',
    //     unlocks: 'lock'
    //   },
    //   '2_and_3': {
    //     name: 'Cosigner 2 & 3',
    //     script:
    //       'OP_0\n<key2.ecdsa_signature.all_outputs>\n<key3.ecdsa_signature.all_outputs>',
    //     unlocks: 'lock'
    //   },
    //   lock: {
    //     lockingType: 'p2sh20',
    //     name: '2-of-3 Vault',
    //     script:
    //       'OP_2\n<key1.public_key>\n<key2.public_key>\n<key3.public_key>\nOP_3\nOP_CHECKMULTISIG'
    //   }
  },
  supported: ['BCH_2021_05', 'BCH_2022_05'],
  version: 0
}

export const createSigner = (
  name /*: string */,
  signerIndex/*: string */,
  scripts/*: string[] */
) /* WalletTemplateEntity */ => ({
  name,
  scripts: ['lock', ...scripts],
  variables: { [`key${signerIndex}`]: { type: 'HdKey' } }
})

/**
 * Generate checkbits required for schnorr signatures.
 */
export const generateSchnorrCheckbits = (cosignerGroups) /* : string  // example: <0b1010> */ => {
  const template = Array(24).fill('0')
  for (const cosignerPosition of cosignerGroups) {
    template.splice(template.length - cosignerPosition, 1, '1')
  }
  return `<0b${template.join('').replace(/^0+/, '')}>` // removed leading zeros
}

export const generateUnlockingScriptDummy = ({
  cosignerGroup /* : int[] // example: [2, 4] */,
  scheme /* ?: ecdsa | schnorr */
}) => {
  const dummy = 'OP_0' // ecdsa
  if (scheme === 'schnorr') {
    return generateSchnorrCheckbits(cosignerGroup)
  }

  return dummy
}

export const generateLockScript = ({ m, n }) => {
  let script = `OP_${m}\n<pubkeys>OP_${n}\nOP_CHECKMULTISIG`
  let pubkeys = ''
  for (let i = 1; i < m + 1; i++) {
    pubkeys += `<key${i}.public_key>\n`
  }
  script = script.replace('<pubkeys>', pubkeys)
  return {
    lockingType: 'p2sh20',
    name: `${m} of ${n} Vault`,
    script
  }
}

export const generateScripts = ({ m, n, scheme /* ? 'ecdsa'|'schnorr' // signature scheme */ }) => {
  const cosignerGroups = groupCosigners({ m, n })
  const scripts = {}

  for (const cosignerGroup of cosignerGroups) {
    const key = cosignerGroup.join('_and_')
    const name = `Cosigner ${cosignerGroup.join(' & ')}`
    const dummy = generateUnlockingScriptDummy({ cosignerGroup, scheme })
    let script = dummy
    for (const cosignerPosition of cosignerGroup) {
      script += `\n<key${cosignerPosition}.${scheme}_signature.all_outputs>`
    }
    scripts[key] = {
      name,
      script,
      unlocks: 'lock'
    }
  }
  scripts.lock = generateLockScript({ m, n })
  return scripts
}

/**
 * options?.$schema = 'https://libauth.org/schemas/wallet-template-v0.schema.json'
 * options?.name = 'm of n Multisig'
 * options.m
 * options.n
 */
export const createWalletTemplate = ({ m, n, scheme }) => {
  const template = baseTemplate
  template.scripts = generateScripts({ m, n, scheme })
  return template
}
