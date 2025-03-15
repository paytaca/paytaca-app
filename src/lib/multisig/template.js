
const baseTemplate = {
  name: '',
  $schema: 'https://libauth.org/schemas/wallet-template-v0.schema.json',
  entities: { /* generate */ },
  scripts: { /* generate */ },
  supported: ['BCH_2021_05', 'BCH_2022_05'],
  version: 0
}

/**
 * Util function for grouping every possible cosigner combinations.
 *
 * // Example usage:
 * const m = 2 // Cosigners to select
 * const n = 3 // Total cosigners
 * const combinations = groupCosigners({m, n})
 * // Output:
 * [
 *  [1, 2],
 *  [1, 3],
 *  [2, 3]
 * ]
 */
export const groupCosigners = ({ m, n }) /*: str[][] */ => {
  const result = []

  const combine = (start, currentCombination) => {
    // If the current combination has m elements, add it to the result
    if (currentCombination.length === m) {
      result.push([...currentCombination])
      return
    }

    // Iterate over the remaining elements to form combinations
    for (let i = start; i <= n; i++) {
      currentCombination.push(i)
      combine(i + 1, currentCombination)
      currentCombination.pop()
    }
  }

  combine(1, [])
  return result
}

/**
 * Generate checkbits required for schnorr signatures.
 */
export const generateSchnorrCheckbits = (cosignerGroups) /* : string  // example: <0b1010> */ => {
  let checkbit = 0
  for (const cosignerPosition of cosignerGroups) {
    checkbit = checkbit | (1 << cosignerPosition - 1)
  }
  return `<0b${checkbit.toString(2)}>`
}

export const generateUnlockingScriptDummy = ({
  cosignerGroup /* : int[] // example: [2, 4] */,
  signatureFormat /* ?: ecdsa | schnorr */
}) => {
  const dummy = 'OP_0' // ecdsa
  if (signatureFormat === 'schnorr') {
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

export const generateScripts = ({ m, n, signatureFormat /* ? 'ecdsa'|'schnorr' // signature signatureFormat */ }) => {
  const cosignerGroups = groupCosigners({ m, n })
  const scripts = {}

  for (const cosignerGroup of cosignerGroups) {
    const key = cosignerGroup.join('_and_')
    const name = `Cosigner ${cosignerGroup.join(' & ')}`
    const dummy = generateUnlockingScriptDummy({ cosignerGroup, signatureFormat })
    let script = dummy
    for (const cosignerPosition of cosignerGroup) {
      script += `\n<key${cosignerPosition}.${signatureFormat}_signature.all_outputs>`
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

export const generateEntity = ({
  signerIndex /*: number // signer position */,
  scripts /* :Object // from generateScripts() */,
  signerNames
}) /* :BitauthTemplateEntity */ => {
  let signerScriptNames = Object.entries(scripts)
    .filter(([scriptName] /* ,scriptValue */) => {
      return scriptName.includes(signerIndex)
    })
    .map(([scriptName]) => {
      return scriptName
    })

  // include 'lock'
  signerScriptNames = ['lock', ...signerScriptNames]
  const entityKey = `signer_${signerIndex}`
  const entityValue = {
    description: '',
    name: signerNames?.[signerIndex] || `Signer ${signerIndex}`,
    scripts: signerScriptNames,
    variables: {
      [`key${signerIndex}`]: {
        description: '',
        name: `key${signerIndex}`,
        type: 'HdKey'
      }
    }
  }
  return [entityKey, entityValue]
}

export const generateEntities = ({ n, scripts /* from generateScripts */, signerNames }) /* :BitauthTemplateEntity */ => {
  const entities = {}
  for (let i = 0; i < n; i++) {
    const [entityKey, entityValue] = generateEntity({ signerIndex: i + 1, scripts, signerNames })
    entities[entityKey] = entityValue
  }
  return entities
}

/**
 * options?.$schema = 'https://libauth.org/schemas/wallet-template-v0.schema.json'
 * options?.name = 'm of n Multisig'
 * options.m
 * options.n
 */
export const createTemplate = ({
  name /* ?: string */,
  m, n,
  signatureFormat, /*: 'ecdsa'|'schnorr' */ /* string[] */
  signerNames /* ?: { [signerIndex: number]: string } */
}) => {
  // TODO: Use signerNames from args
  const template = baseTemplate
  template.name = name || `${m}-of-${n} Multisig`
  template.scripts = generateScripts({ m, n, signatureFormat: signatureFormat || 'schnorr' })
  template.entities = generateEntities({ n, scripts: template.scripts, signerNames })
  return template
}
