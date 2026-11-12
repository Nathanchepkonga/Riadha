import assert from "node:assert/strict";
import test from "node:test";
import { checkMessage } from "../src/lib/chat/filter";

test("allows ordinary sports conversation", () => {
  assert.deepEqual(checkMessage("Great pass and clean sheet today"), { ok: true });
});

test("blocks personal contact details and payment cards", () => {
  assert.equal(checkMessage("Call me on 0712 345 678").ok, false);
  assert.equal(checkMessage("My email is player@example.com").ok, false);
  assert.equal(checkMessage("Card 4111 1111 1111 1111").ok, false);
});

test("blocks directed abuse and the sender's real name", () => {
  assert.equal(checkMessage("you are an idiot").ok, false);
  assert.equal(checkMessage("Faith Chebet", { realName: "Faith Chebet" }).ok, false);
});
