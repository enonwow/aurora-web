# Real Aurora persistence fixtures

- `real-last-city-module.ifo.gz.base64` is a gzip+base64 encoded, byte-exact
  copy of the isolated Last City proof `module.ifo` (11,956 bytes,
  SHA-256 `d2a1c92a65ef260282976b2ec6a37f3c1efe2807779bb8c892042d1a58444625`).
- `real-tms01.set.gz.base64` is a gzip+base64 encoded, byte-exact retail
  `tms01.set` source (16 tiles).

The cold-reopen integration proof decodes these fixtures only into a temporary
filesystem store. It never opens or mutates the user's configured module
snapshot or the read-only decompilation oracle.
