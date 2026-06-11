import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EXPLORER, STATUS, ZERO, fmtPhrs, short, type Task } from "../chain";
import { useApp } from "../ui/AppContext";

const STATUS_CLASS = ["open", "claimed", "submitted", "completed", "cancelled"];

export default function Board() {
  const { tasks, tasksError, address } = useApp();
  const [tab, setTab] = useState<"all" | "open" | "mine">("all");
  const me = address?.toLowerCase();

  const visible = useMemo(() => {
    if (!tasks) return [];
    if (tab === "open") return tasks.filter((t) => t.status === 0);
    if (tab === "mine")
      return tasks.filter(
        (t) =>
          me &&
          (t.requester.toLowerCase() === me || t.worker.toLowerCase() === me),
      );
    return tasks;
  }, [tasks, tab, me]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Task board</h1>
          <p className="page-sub">
            Live from the escrow contract. Connect a wallet to claim, submit, or
            settle.
          </p>
        </div>
        <div className="tabs" role="tablist" aria-label="Filter tasks">
          {(["all", "open", "mine"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={`tab ${tab === k ? "tab-on" : ""}`}
              onClick={() => setTab(k)}
            >
              {k === "all" ? "All" : k === "open" ? "Open" : "Mine"}
            </button>
          ))}
        </div>
      </div>

      {tasksError && (
        <p className="board-error">RPC unreachable: {tasksError}. Retrying…</p>
      )}

      {!tasks && !tasksError && (
        <div className="rows" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div className="row skeleton" key={i} />
          ))}
        </div>
      )}

      {tasks && visible.length === 0 && (
        <p className="empty">
          {tab === "mine" ? (
            address ? (
              "No tasks involve this wallet yet. Claim one from the board, or post your own."
            ) : (
              "Connect a wallet to see your tasks."
            )
          ) : (
            <>
              No open tasks right now.{" "}
              <Link to="/post">Post the first bounty.</Link>
            </>
          )}
        </p>
      )}

      <div className="rows">
        {visible.map((t) => (
          <TaskRow key={String(t.id)} t={t} me={me} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ t, me }: { t: Task; me: string | undefined }) {
  const { write, busy } = useApp();
  const [openDetail, setOpenDetail] = useState(false);
  const [result, setResult] = useState("");
  const [reason, setReason] = useState("");
  const now = Math.floor(Date.now() / 1000);

  const isRequester = me && t.requester.toLowerCase() === me;
  const isWorker = me && t.worker.toLowerCase() === me;
  const st = STATUS[t.status];

  const canClaim =
    st === "Open" && me && !isRequester && now <= Number(t.claimDeadline);
  const canCancel =
    st === "Open" && isRequester && now > Number(t.claimDeadline);
  const canSubmit = st === "Claimed" && isWorker;
  const canReview = st === "Submitted" && isRequester;
  const canForce =
    st === "Submitted" &&
    isWorker &&
    now >= Number(t.submittedAt) + Number(t.reviewWindow);

  const id = Number(t.id);

  return (
    <article className={`row ${openDetail ? "row-open" : ""}`}>
      <button
        className="row-main"
        onClick={() => setOpenDetail((v) => !v)}
        aria-expanded={openDetail}
      >
        <span
          className={`dot dot-${STATUS_CLASS[t.status]}`}
          aria-hidden="true"
        />
        <span className="row-id mono">#{id}</span>
        <span className="row-spec">{t.spec}</span>
        <span className="row-status">{st}</span>
        <span className="row-bounty mono">
          {t.status === 3 ? "paid" : `${fmtPhrs(t.bounty)} PHRS`}
        </span>
      </button>

      {openDetail && (
        <div className="row-detail">
          <dl>
            <div>
              <dt>Requester</dt>
              <dd className="mono">
                <a
                  href={`${EXPLORER}/address/${t.requester}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(t.requester)}
                </a>
                {isRequester ? " (you)" : ""}
              </dd>
            </div>
            <div>
              <dt>Worker</dt>
              <dd className="mono">
                {t.worker === ZERO ? (
                  "unclaimed"
                ) : (
                  <>
                    <a
                      href={`${EXPLORER}/address/${t.worker}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(t.worker)}
                    </a>
                    {isWorker ? " (you)" : ""}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Claimable until</dt>
              <dd>
                {new Date(Number(t.claimDeadline) * 1000).toLocaleString()}
              </dd>
            </div>
            {t.result && (
              <div className="span2">
                <dt>Result</dt>
                <dd className="mono result-ref">{t.result}</dd>
              </div>
            )}
          </dl>

          <div className="row-actions">
            {canClaim && (
              <button
                className="btn solid"
                disabled={busy !== null}
                onClick={() => write(`Claim #${id}`, "claimTask", [t.id])}
              >
                {busy === `Claim #${id}` ? "Claiming…" : "Claim task"}
              </button>
            )}
            {canSubmit && (
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (result.trim())
                    write(`Submit #${id}`, "submitResult", [
                      t.id,
                      result.trim(),
                    ]);
                }}
              >
                <input
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="Result reference: ipfs://… or URL"
                  aria-label="Result reference"
                  required
                />
                <button className="btn solid" disabled={busy !== null}>
                  {busy === `Submit #${id}` ? "Submitting…" : "Submit result"}
                </button>
              </form>
            )}
            {canReview && (
              <>
                <button
                  className="btn solid"
                  disabled={busy !== null}
                  onClick={() =>
                    write(`Approve #${id}`, "approveAndPay", [t.id])
                  }
                >
                  {busy === `Approve #${id}` ? "Paying…" : "Approve & pay"}
                </button>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reason.trim())
                      write(`Reject #${id}`, "rejectSubmission", [
                        t.id,
                        reason.trim(),
                      ]);
                  }}
                >
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Rejection reason"
                    aria-label="Rejection reason"
                    required
                  />
                  <button className="btn danger" disabled={busy !== null}>
                    Reject
                  </button>
                </form>
              </>
            )}
            {canForce && (
              <button
                className="btn solid"
                disabled={busy !== null}
                onClick={() =>
                  write(`Force-settle #${id}`, "forceSettle", [t.id])
                }
              >
                Force settle (review window passed)
              </button>
            )}
            {canCancel && (
              <button
                className="btn ghost"
                disabled={busy !== null}
                onClick={() => write(`Cancel #${id}`, "cancelTask", [t.id])}
              >
                Cancel & refund
              </button>
            )}
            {!me && st === "Open" && (
              <span className="hint">Connect a wallet to claim this task.</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
