import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRoom, joinRoom, loadRoom, manageRoom, type PracticeRoom } from "./rooms";
import "./rooms.css";

export default function PracticeRooms({ client, saving }: { client?: SupabaseClient; saving?: boolean }) {
  const [room, setRoom] = useState<PracticeRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adult, setAdult] = useState(false);
  const [invite, setInvite] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const run = async (operation: () => Promise<PracticeRoom | null>, success: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await operation();
      if (active.current) { setRoom(next); setLoaded(true); setNotice(success); }
    } catch (failure) {
      if (active.current) setError(failure instanceof Error ? failure.message : "The room request failed. Try refreshing.");
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (!client) return;
    void run(() => loadRoom(client), "Room refreshed.");
  }, [client]);
  const ready = !!client && !busy && !saving;
  const manage = (action: "rotate" | "remove" | "close" | "leave", member?: string) => {
    if (!client || !ready || !adult) return;
    const prompt = action === "close" ? "Close this room for everyone? Standings will no longer be shared."
      : action === "remove" ? "Remove this learner? Their standing disappears and the invite code changes."
        : action === "leave" ? "Leave this room? Your current standing disappears. Your own learning progress stays saved."
          : "Replace the invite code? Previously shared codes will stop working.";
    if (!window.confirm(prompt)) return;
    void run(() => manageRoom(client, action, member), action === "rotate" || action === "remove"
      ? "Room updated. The host should share the new invite code privately." : "Room membership updated.");
  };
  const standings = room ? [...room.members].sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname)) : [];
  return <section className="practice-rooms" aria-label="Private practice rooms">
    <div className="page-heading"><div><span className="eyebrow">FRIENDLY COMPETITION · PRIVATE INVITES</span>
      <h1>Practice together. Cheer for everyone.</h1>
      <p>A parent or teacher creates a room and shares its code privately. Learners compete using generated nicknames, not names or emails. No chat, public profiles, or matchmaking.</p>
    </div></div>
    <div className="panel room-rules">
      <h2>Small steps count here</h2>
      <p><strong>+10 room points per saved five-question English/Math or spelling bee round, up to 5 rounds per UTC day.</strong>
        {" "}Correctness and speed do not change room points. Weekly standings run Monday–Sunday in UTC and reset automatically each Monday.
        No one loses points for mistakes. Coding and AI lessons earn personal points, not room points.</p>
      <p>Room points are separate from personal points. The server caps participation credits and uses its own clock,
        but completed rounds come from the learner's device and are not proctored or cheat-proof.
        This is friendly practice, never a contest for prizes.</p>
      <p>Each signed-in grown-up account represents one learner and can join one room at a time (30 learners maximum).
        Different learners need separate grown-up-managed accounts/devices. Ask a trusted adult before joining.</p>
    </div>
    {!client ? <div className="panel room-setup" role="status">
      <h2>Grown-up sign-in needed</h2>
      <p>Private online rooms need real Supabase sign-in and the private rooms database migration.
        Guest play cannot join a room. No demo opponents are shown here.</p>
      <p>Use Sign in above. The grown-up setting up this website must configure Supabase and deploy
        <code> 202610290002_private_practice_rooms.sql</code> after the progress migration.</p>
    </div> : <div className="panel room-controls">
      <div className="room-actions">
        <button className="button secondary" disabled={!ready} onClick={() => void run(() => loadRoom(client), "Standings refreshed from the server.")}>
          {busy ? "Working…" : "Refresh room"}
        </button>
        {saving && <p role="status">Personal progress is saving. Wait, then refresh room standings.</p>}
      </div>
      {error && <p className="room-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label className="room-consent">
        <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
        I am a parent, guardian, or teacher. I approve sharing this learner's generated nickname and weekly practice points with invited room members.
      </label>
      <p className="room-privacy">This checkbox is an attestation, not age verification or complete child-privacy compliance.
        Keep the invite code private. Any grown-up account with the code can join; rotate it if shared outside your group.
        Host controls do not replace adult supervision.</p>
      {loaded && !room && <div className="room-entry">
        <div><h2>Start a private room</h2><p>You become the host. Share the code with known families or your class through a trusted adult channel.</p>
          <button className="button primary" disabled={!ready || !adult} onClick={() =>
            void run(() => createRoom(client), "Your private room is ready. Share the code only with people you know.")}>Create a room</button>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (ready && adult) void run(() => joinRoom(client, invite), "You joined the room. Your new saved practice rounds can earn room points.");
        }}>
          <h2>Have an invite?</h2>
          <label htmlFor="room-invite">Private invite code</label>
          <input id="room-invite" autoComplete="off" spellCheck={false} value={invite} maxLength={40}
            onChange={(event) => setInvite(event.target.value)} placeholder="32-character code from your host" />
          <button className="button primary" disabled={!ready || !adult || !invite.trim()}>Join this room</button>
        </form>
      </div>}
      {room && <>
        <h2>Your private room</h2>
        <p><strong>You are {room.members.find((member) => member.isYou)?.nickname}.</strong>
          {" "}{room.members.length}/30 learners · {room.todayRounds}/5 room-credit rounds used today (UTC).
          Joining/rejoining starts a new visible standing; daily limits still apply across rooms.</p>
        {room.isHost && <div className="room-invite">
          <details><summary>Host: reveal private invitation code</summary>
            <p>Share with trusted grown-ups only. This code grants room access.</p>
            <code>{room.inviteCode}</code>
          </details>
          <button className="button secondary" disabled={!ready || !adult} onClick={() => manage("rotate")}>Replace invite code</button>
        </div>}
        <p>Week: {room.weekStart.slice(0, 10)} through {new Date(Date.parse(room.weekEnd) - 86400000).toISOString().slice(0, 10)} (UTC).
          {" "}Press Refresh room to see other learners' new saved rounds; this is not a live race.</p>
        <div className="room-table-wrap"><table className="room-table">
          <caption>Private weekly practice standings. Equal points share a rank; every learner's practice matters.</caption>
          <thead><tr><th>Place</th><th>Nickname</th><th>Room points</th>{room.isHost && <th>Host controls</th>}</tr></thead>
          <tbody>{standings.map((member) => <tr key={member.id} className={member.isYou ? "room-you" : ""}>
            <td>{1 + standings.filter((other) => other.points > member.points).length}</td>
            <th>{member.nickname}{member.isYou ? " (you)" : ""}{member.isHost ? " (host)" : ""}</th>
            <td>{member.points}</td>
            {room.isHost && <td>{!member.isHost && <button className="button secondary" disabled={!ready || !adult}
              onClick={() => manage("remove", member.id)} aria-label={`Remove ${member.nickname}`}>Remove</button>}</td>}
          </tr>)}</tbody>
        </table></div>
        <button className="button secondary" disabled={!ready || !adult} onClick={() => manage(room.isHost ? "close" : "leave")}>
          {room.isHost ? "Close room for everyone" : "Leave room"}
        </button>
      </>}
    </div>}
    <p className="room-privacy">Leaving/removal hides your room standing; closing hides the room for all members.
      Server credit records remain until the account or room data is deleted under the site's retention policy.
      Removing an adult account deletes its membership and credits. Before use with children, the operator must establish consent, retention, and deletion policies.</p>
  </section>;
}
