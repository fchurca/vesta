var URD_MAX_SIDES = 281474976710656

function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2)
  for (var i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  return bytes
}

function bytesToHex(bytes) {
  var s = ""
  for (var i = 0; i < bytes.length; i++)
    s += bytes[i].toString(16).padStart(2, "0")
  return s
}

function bytesToBase64(bytes) {
  var bin = ""
  for (var i = 0; i < bytes.length; i++)
    bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function strToUtf8Bytes(s) {
  return new TextEncoder().encode(s)
}

async function taggedHash(tag) {
  var parts = Array.prototype.slice.call(arguments, 1)
  var enc = new TextEncoder()
  var tagHash = await crypto.subtle.digest("SHA-256", enc.encode(tag))
  var tagHashBytes = new Uint8Array(tagHash)
  var totalLen = tagHashBytes.length * 2
  for (var i = 0; i < parts.length; i++)
    totalLen += enc.encode(parts[i]).length
  var buf = new Uint8Array(totalLen)
  buf.set(tagHashBytes, 0)
  buf.set(tagHashBytes, tagHashBytes.length)
  var offset = tagHashBytes.length * 2
  for (var i = 0; i < parts.length; i++) {
    var bytes = enc.encode(parts[i])
    buf.set(bytes, offset)
    offset += bytes.length
  }
  var digest = await crypto.subtle.digest("SHA-256", buf)
  return bytesToHex(new Uint8Array(digest))
}

function randomHex(byteLength) {
  byteLength = byteLength || 64
  var buf = new Uint8Array(byteLength)
  crypto.getRandomValues(buf)
  return bytesToHex(buf)
}

async function createClosedSecret(author, seqId, secret, seed) {
  var fingerprint = await taggedHash("urd-commit/v1", seed, String(author), String(seqId), secret)
  return { seed: seed, author: String(author), seqId: seqId, fingerprint: fingerprint }
}

function createPool(author, commitments) {
  var sorted = commitments.slice().sort(function (a, b) { return a.seqId - b.seqId })
  return { author: String(author), commitments: sorted, consumed: [], secrets: {} }
}

function addToPool(pool, commitment, secret) {
  var sorted = pool.commitments.concat([commitment]).sort(function (a, b) { return a.seqId - b.seqId })
  var secrets = {}
  for (var k in pool.secrets) secrets[k] = pool.secrets[k]
  secrets[commitment.seqId] = secret
  return { author: pool.author, commitments: sorted, consumed: pool.consumed.slice(), secrets: secrets }
}

function consumeSecrets(pool, rollId, reveals) {
  var remaining = pool.commitments.slice()
  var consumed = pool.consumed.slice()
  for (var i = 0; i < reveals.length; i++) {
    var reveal = reveals[i]
    remaining.shift()
    consumed.push({
      seed: reveal.seed,
      author: reveal.author,
      seqId: reveal.seqId,
      fingerprint: reveal.fingerprint,
      secret: reveal.secret,
      rollId: rollId,
    })
  }
  return { author: pool.author, commitments: remaining, consumed: consumed, secrets: pool.secrets }
}

async function deriveRoll(gameHash, secrets, sides) {
  var maxAcceptable = URD_MAX_SIDES - (URD_MAX_SIDES % sides)
  var ghB64 = bytesToBase64(hexToBytes(gameHash))
  var encoded = []
  for (var i = 0; i < secrets.length; i++)
    encoded.push(bytesToBase64(strToUtf8Bytes(secrets[i])))
  var input = ghB64 + ":" + encoded.join(":")
  var hash = await taggedHash("urd-roll/v1", input)
  var offset = 0
  while (true) {
    if (offset + 12 > hash.length) {
      hash = bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", hexToBytes(hash))))
      offset = 0
    }
    var val = parseInt(hash.substring(offset, offset + 12), 16)
    offset += 12
    if (val < maxAcceptable) return (val % sides) + 1
  }
}

async function resolveRoll(pools, gameHash, sides, participants, rollId) {
  var requests = []
  var reveals = []
  for (var i = 0; i < participants.length; i++) {
    var pi = participants[i]
    var pool = pools[pi]
    var commitment = pool.commitments[0]
    requests.push({ author: String(pi), seqId: commitment.seqId, fingerprint: commitment.fingerprint })
    var rawSecret = pool.secrets[commitment.seqId]
    reveals.push({ seed: commitment.seed, author: String(pi), seqId: commitment.seqId, secret: rawSecret, fingerprint: commitment.fingerprint })
  }
  var declaration = { gameHash: gameHash, sides: sides, requests: requests }
  var roll = await deriveRoll(gameHash, reveals.map(function (r) { return r.secret }), sides)
  for (var i = 0; i < participants.length; i++) {
    var pi = participants[i]
    pools[pi] = consumeSecrets(pools[pi], rollId, [reveals[i]])
    var refilled = await refillPool(pools[pi], gameHash)
    pools[pi] = refilled.pool
    pools[pi].secrets[refilled.commitment.seqId] = refilled.secret
  }
  var resolution = { declaration: declaration, reveals: reveals, roll: roll }
  return { roll: roll, pools: pools, resolution: resolution }
}

async function refillPool(pool, seed) {
  var seqId = pool.commitments.length > 0
    ? pool.commitments[pool.commitments.length - 1].seqId + 1
    : 0
  var secret = randomHex(64)
  var commitment = await createClosedSecret(pool.author, seqId, secret, seed)
  var newPool = addToPool(pool, commitment, secret)
  return { pool: newPool, commitment: commitment, secret: secret }
}

async function createInitialPool(author, count, seed) {
  var commitments = []
  var secrets = {}
  for (var i = 0; i < count; i++) {
    var secret = randomHex(64)
    var commitment = await createClosedSecret(String(author), i, secret, seed)
    commitments.push(commitment)
    secrets[i] = secret
  }
  var sorted = commitments.slice().sort(function (a, b) { return a.seqId - b.seqId })
  return { author: String(author), commitments: sorted, consumed: [], secrets: secrets }
}

