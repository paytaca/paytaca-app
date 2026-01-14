import { cardApi } from "./api";

async function getChallenge(publicKey) {
  try {
    console.log("getChallenge publicKey:", publicKey);
    const response = await cardApi.post('/auth/challenge/', { "public_key": publicKey })
    console.log('response:', response)
    return response.data
  } catch (error) {
    console.error('Error getting challenge:', error)
    return error.response;
  }
}

async function verifyChallenge(data) {
    try {
        console.log("verifyChallenge data:", data);
        const response = await cardApi.post('/auth/verify/', data)
        console.log('response:', response)
        return response.data
    } catch (error) {
        console.error('Error verifying challenge:', error)
        return error.response;
    }
}

export { getChallenge, verifyChallenge }