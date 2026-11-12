import assert from "node:assert/strict";
import test from "node:test";
import { validateSquad, validateXI, transferLedger, type SquadPlayer } from "../src/lib/fantasy/rules";

const squad: SquadPlayer[] = [
  { id: 1, position: "GK", clubId: 1, price: 50 },
  { id: 2, position: "GK", clubId: 2, price: 50 },
  ...Array.from({ length: 13 }, (_, i) => ({
    id: i + 3,
    position: (i < 5 ? "DEF" : i < 10 ? "MID" : "FWD") as SquadPlayer["position"],
    clubId: ((i + 2) % 5) + 1,
    price: 50,
  })),
];

test("accepts a valid 15-player squad", () => {
  assert.equal(validateSquad(squad), null);
});

test("rejects a squad over budget or club limit", () => {
  assert.match(validateSquad(squad.map((p) => ({ ...p, price: 100 }))) ?? "", /Over budget/);
  assert.match(validateSquad(squad.map((p) => ({ ...p, clubId: 1 }))) ?? "", /Max 3/);
});

test("enforces starting XI formation limits", () => {
  assert.equal(validateXI(["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"]), null);
  assert.match(validateXI(["GK", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"]) ?? "", /defenders/);
});

test("calculates transfer rollover and hits", () => {
  const ledger = transferLedger(1, 4, new Map([[2, 0], [3, 3], [4, 1]]));
  assert.deepEqual(ledger.get(1), { free: Infinity, made: 0, hits: 0 });
  assert.deepEqual(ledger.get(2), { free: 1, made: 0, hits: 0 });
  assert.deepEqual(ledger.get(3), { free: 2, made: 3, hits: 4 });
  assert.deepEqual(ledger.get(4), { free: 1, made: 1, hits: 0 });
});
