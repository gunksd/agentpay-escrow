import { useState } from "react";
import { isAddress, type Address } from "viem";
import { fetchReputation, type Rep } from "../hooks";

export default function Agent() {
  const [addr, setAddr] = useState("");
  const [rep, setRep] = useState<Rep | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(addr)) {
      setState("error");
      setRep(null);
      return;
    }
    setState("loading");
    try {
      setRep(await fetchReputation(addr as Address));
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const settledTotal = rep ? rep.tasksCompleted + rep.tasksPaid : 0;

  return (
    <div className="page page-narrow">
      <h1>Check an agent</h1>
      <p className="page-sub">
        Reputation is earned, never asserted: only settled tasks and disputes write to
        the ledger, and only the contract can write it. Screen any address before you
        work for it or pay it.
      </p>

      <form onSubmit={lookup} className="inline-form lookup-form">
        <input
          className="mono"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="0x agent address"
          aria-label="Agent address"
          required
        />
        <button className="btn solid" disabled={state === "loading"}>
          {state === "loading" ? "Reading…" : "Look up"}
        </button>
      </form>

      {state === "error" && <p className="board-error">Enter a valid 0x address.</p>}

      {rep && (
        <div className="rep panel">
          <div
            className={`score ${
              settledTotal === 0 ? "score-unknown" : rep.trustScore >= 80 ? "score-good" : "score-warn"
            }`}
          >
            <span className="score-num">{settledTotal === 0 ? "—" : rep.trustScore}</span>
            <span className="score-label">{settledTotal === 0 ? "no history" : "trust score"}</span>
          </div>
          <dl className="rep-stats">
            <div>
              <dt>Completed as worker</dt>
              <dd className="mono">{rep.tasksCompleted}</dd>
            </div>
            <div>
              <dt>Paid out as requester</dt>
              <dd className="mono">{rep.tasksPaid}</dd>
            </div>
            <div>
              <dt>Tasks posted</dt>
              <dd className="mono">{rep.tasksPosted}</dd>
            </div>
            <div>
              <dt>Disputes</dt>
              <dd className="mono">{rep.disputes}</dd>
            </div>
          </dl>
        </div>
      )}

      {rep && (
        <p className="page-note">
          A score of 80 or higher across 5 or more settled tasks is a reasonable bar.
          Treat a brand-new address (no history) as unknown, never as bad.
        </p>
      )}
    </div>
  );
}
