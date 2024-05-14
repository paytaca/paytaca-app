import sha256 from 'js-sha256'
import Watchtower from 'watchtower-cash-js'

export async function saveShardToWatchtower (shards) {
  const watchtower = new Watchtower()

  const firstIdentifier = sha256(shards[1])
  const secondIdentifier = sha256(shards[2])

  const data = {
    shard: shards[0],
    first_identifier: firstIdentifier,
    second_identifier: secondIdentifier
  }

  try {
    await watchtower.BCH._api.post('wallet/shard/', data)
  } catch (error) {
    console.error(error)
  }
}

// TODO add method for retrieving 1st shard using first and second identifier (2nd and 3rd shard)
