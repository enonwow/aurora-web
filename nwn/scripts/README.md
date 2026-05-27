# NWN Redis Job Scripts

This folder contains NWScript files for consuming Redis PubSub jobs inside NWN (via NWNX Redis plugin).

## Required NWNX plugins

- `Redis`
- `Object`

Required includes in module:

- `nwnx_redis`
- `nwnx_redis_lib`
- `nwnx_redis_ps`
- `nwnx_object`

## Script files

- `aur_job_inc.nss`: shared helpers (payload parsing + Redis result write)
- `aur_job_exec.nss`: job dispatcher and handlers (`create_object`, `move_object`, `destroy_object`, ...)
- `on_pubsub.nss`: PubSub entrypoint called by NWNX Redis

## NWNX environment (example)

- `NWNX_REDIS_HOST=redis`
- `NWNX_REDIS_PORT=6379`
- `NWNX_REDIS_PUBSUB_SCRIPT=on_pubsub`
- `NWNX_REDIS_PUBSUB_CHANNELS=aurora.jobs`

## Message contract

Message can be:

1. Inline payload:

`jobId=...;action=create_object;objectType=placeable;resref=plc_x02;tag=plc_x02_01;areaTag=area_start;x=10.0;y=12.0;z=0.0;facing=90.0`

2. Redis key that stores payload:

`aurora:jobs:payload:<jobId>`

In that case `on_pubsub` reads payload with `GET <message>`.

## Supported actions

- `create_object`
- `move_object`
- `destroy_object`
- `set_local_int`
- `set_local_string`

## Result contract

Result is written to key:

- `aurora:jobs:result:<jobId>`

Value format:

`jobId=<id>;status=<completed|failed>;message=<details>`
