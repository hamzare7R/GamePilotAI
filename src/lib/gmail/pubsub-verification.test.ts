import { describe, expect, it } from "vitest";

import {
  parsePubSubPayload,
  PubSubVerificationError,
} from "./pubsub-verification";

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

describe("parsePubSubPayload", () => {
  it("accepts a valid string historyId", () => {
    const data = encodePayload({
      emailAddress: "User@Example.com",
      historyId: "12345",
    });

    expect(parsePubSubPayload(data)).toEqual({
      emailAddress: "user@example.com",
      historyId: "12345",
    });
  });

  it("accepts a positive safe numeric historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: 12345,
    });

    expect(parsePubSubPayload(data)).toEqual({
      emailAddress: "user@example.com",
      historyId: "12345",
    });
  });

  it("accepts a payload with missing Base64URL padding", () => {
    const data = encodePayload({
      emailAddress: "a@b.com",
      historyId: "1",
    }).replace(/=+$/, "");

    expect(parsePubSubPayload(data)).toEqual({
      emailAddress: "a@b.com",
      historyId: "1",
    });
  });

  it("rejects invalid JSON", () => {
    const data = Buffer.from("not-json").toString("base64url");

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );

    try {
      parsePubSubPayload(data);
    } catch (error) {
      expect((error as PubSubVerificationError).code).toBe(
        "PAYLOAD_INVALID",
      );
    }
  });

  it("rejects a non-object decoded value", () => {
    const data = encodePayload(["emailAddress", "historyId"]);

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects missing emailAddress", () => {
    const data = encodePayload({ historyId: "12345" });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects emailAddress with invalid type", () => {
    const data = encodePayload({
      emailAddress: 123,
      historyId: "12345",
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects an empty emailAddress", () => {
    const data = encodePayload({
      emailAddress: " ",
      historyId: "12345",
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects missing historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects empty historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: "",
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects whitespace-only historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: "   ",
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects zero historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: 0,
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects negative historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: -123,
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects fractional numeric historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: 12.5,
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects unsafe integer historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: Number.MAX_SAFE_INTEGER + 1,
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });

  it("rejects null historyId", () => {
    const data = encodePayload({
      emailAddress: "user@example.com",
      historyId: null,
    });

    expect(() => parsePubSubPayload(data)).toThrow(
      PubSubVerificationError,
    );
  });
});