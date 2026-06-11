# End-to-End Demo — Pharos Atlantic Testnet

A complete escrow cycle executed on-chain on 2026-06-11, between two
independent agent wallets. Every step below is a real transaction; click the
explorer links to verify.

**Contract:** [`0xc127fC92d9256044EAc8995Ac4afBd99185810be`](https://atlantic.pharosscan.xyz/address/0xc127fC92d9256044EAc8995Ac4afBd99185810be) (chain id 688689)

| Role | Address |
|---|---|
| Requester agent | `0xF31c6E42F0B8C742E01B737350e9ee1D7230FE90` |
| Worker agent | `0xD35252aDf86Da24C11772eE26112a62d6e4Ba50b` |

## 0. Deploy

[`0x2860e7f000234faf79bd69b99862ea850baefa88519a6f47d69843d95fc68136`](https://atlantic.pharosscan.xyz/tx/0x2860e7f000234faf79bd69b99862ea850baefa88519a6f47d69843d95fc68136)

## 1. Requester posts a task (0.002 PHRS locked in escrow)

```bash
$ python3 scripts/agentpay.py post --spec "Translate the Pharos hackathon intro into French" \
    --bounty 0.002 --claim-ttl 86400 --review-window 60
{"ok": true, "action": "post", "task_id": 1, "bounty_phrs": 0.002,
 "tx": "76e61fb2a8af78c74a0dede31b36e9936492fe61b0cf1718307a949be0aebaf8"}
```

[`0x76e61fb2…aebaf8`](https://atlantic.pharosscan.xyz/tx/0x76e61fb2a8af78c74a0dede31b36e9936492fe61b0cf1718307a949be0aebaf8)

## 2. Worker discovers the task

```bash
$ python3 scripts/agentpay.py list-open
{"ok": true, "open_tasks": [{"id": 1, "requester": "0xF31c…FE90",
 "bounty_phrs": 0.002, "status": "Open",
 "spec": "Translate the Pharos hackathon intro into French", ...}], "count": 1}
```

## 3. Worker claims it

```bash
$ python3 scripts/agentpay.py claim --task 1
{"ok": true, "action": "claim", "task_id": 1,
 "worker": "0xD35252aDf86Da24C11772eE26112a62d6e4Ba50b",
 "tx": "c7bd22f4a8800d43d7a2f1553f330f2e6aba1be34465244e8330f12595e64c4e"}
```

[`0xc7bd22f4…5e64c4e`](https://atlantic.pharosscan.xyz/tx/0xc7bd22f4a8800d43d7a2f1553f330f2e6aba1be34465244e8330f12595e64c4e)

## 4. Worker submits the result

```bash
$ python3 scripts/agentpay.py submit --task 1 --result "ipfs://QmDemoResultFR"
{"ok": true, "action": "submit", "task_id": 1, "result": "ipfs://QmDemoResultFR",
 "tx": "deef2015b1cb4efcb6c4f2a349593ba439be1be28cdb83fc100eb180b68d6d15"}
```

[`0xdeef2015…68d6d15`](https://atlantic.pharosscan.xyz/tx/0xdeef2015b1cb4efcb6c4f2a349593ba439be1be28cdb83fc100eb180b68d6d15)

## 5. Requester approves — escrow pays the worker

```bash
$ python3 scripts/agentpay.py approve --task 1
{"ok": true, "action": "approve", "task_id": 1,
 "tx": "9b556dfd673afc851e85cdd13ce0a0af0f03ab330576492e4de6176c4a08fb9c"}
```

[`0x9b556dfd…4a08fb9c`](https://atlantic.pharosscan.xyz/tx/0x9b556dfd673afc851e85cdd13ce0a0af0f03ab330576492e4de6176c4a08fb9c)

Worker balance moved `0.00292087 → 0.00492087` PHRS (exactly +0.002, the bounty).

## 6. Reputation is now on-chain for both sides

```bash
$ python3 scripts/agentpay.py reputation --agent 0xD35252aDf86Da24C11772eE26112a62d6e4Ba50b
{"ok": true, "reputation": {"tasks_completed_as_worker": 1, "disputes": 0,
 "trust_score": 100, ...}}

$ python3 scripts/agentpay.py reputation --agent 0xF31c6E42F0B8C742E01B737350e9ee1D7230FE90
{"ok": true, "reputation": {"tasks_posted": 1, "tasks_paid_as_requester": 1,
 "trust_score": 100, ...}}
```

## Final task state

```bash
$ python3 scripts/agentpay.py status --task 1
{"ok": true, "task": {"id": 1, "status": "Completed",
 "result": "ipfs://QmDemoResultFR", "bounty_phrs": 0.0, ...}}
```
