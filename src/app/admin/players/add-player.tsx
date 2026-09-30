"use client";

import { useActionState } from "react";
import { addPlayer } from "@/actions/admin";
import { FormMessage, SubmitButton } from "@/components/ui/forms";

export function AddPlayerForm({ clubs, defaultClub }: { clubs: { id: number; name: string }[]; defaultClub?: number }) {
  const [state, action] = useActionState(addPlayer, undefined);
  return (
    <form action={action} className="card mt-6 grid grid-cols-2 gap-2 p-4">
      <p className="col-span-2 h5">Add player</p>
      <input name="name" required placeholder="Full name" className="field col-span-2" aria-label="Name" />
      <select name="clubId" defaultValue={defaultClub} className="field" aria-label="Club">
        {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select name="position" className="field" aria-label="Position">
        <option value="GK">Goalkeeper</option>
        <option value="DEF">Defender</option>
        <option value="MID">Midfielder</option>
        <option value="FWD">Forward</option>
      </select>
      <input name="price" type="number" step="0.5" min="3.5" max="15" required placeholder="Price (KSh m)" className="field col-span-2" aria-label="Price" />
      <div className="col-span-2"><FormMessage state={state} /></div>
      <SubmitButton className="btn-primary col-span-2">Add player</SubmitButton>
    </form>
  );
}
