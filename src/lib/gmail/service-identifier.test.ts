import { describe, expect, it } from "vitest";

import { identifyService } from "./service-identifier";

describe("identifyService", () => {
  it.each([
    ["alerts@linkedin.com", "linkedin.com", "linkedin", "LinkedIn"],
    ["notice@notify.linkedin.com", "notify.linkedin.com", "linkedin", "LinkedIn"],
    ["notification@service.tiktok.com", "service.tiktok.com", "tiktok", "TikTok"],
    ["updates@commerce.temuemail.com", "commerce.temuemail.com", "temu", "Temu"],
    ["support@temu.com", "temu.com", "temu", "Temu"],
    ["alert@gmail.com", "gmail.com", "google", "Google"],
    ["no-reply@garena.com", "garena.com", "garena", "Garena / Free Fire"],
    ["support@ff.garena.com", "ff.garena.com", "garena", "Garena / Free Fire"],
    ["account@pubgmobile.com", "pubgmobile.com", "pubg", "PUBG / PUBG Mobile"],
    ["notice@mobilelegends.com", "mobilelegends.com", "moonton", "Moonton / Mobile Legends"],
    ["noreply@supercell.com", "supercell.com", "supercell", "Supercell"],
    ["no-reply@roblox.com", "roblox.com", "roblox", "Roblox"],
    ["security@tradingview.com", "tradingview.com", "tradingview", "TradingView"],
    ["notifications@discord.com", "discord.com", "discord", "Discord"],
    ["noreply@github.com", "github.com", "github", "GitHub"],
  ] as const)(
    "recognizes %s from its sender domain",
    (sender, domain, service, label) => {
      const result = identifyService(sender, domain);
      expect(result.service).toBe(service);
      expect(result.label).toBe(label);
      expect(result.category).not.toBe("unknown_sender");
    },
  );

  it.each([
    "evil-linkedin.com",
    "linkedin.com.evil.test",
    "notiktok.com",
    "tiktok.com.evil.test",
    "temuemail.com.evil.test",
    "fake-temu.com",
    "garena.com.attacker.test",
    "fakegarena.com",
    "pubgmobile.com.evil.test",
  ])("does not recognize lookalike domain %s", (domain) => {
    const result = identifyService("notice@attacker.test", domain);
    expect(result.service).toBe("other");
    expect(result.category).toBe("unknown_sender");
    expect(result.matchedDomain).toBeNull();
  });
});
