import { describe, expect, it } from "vitest";
import { installWay, stepsFor, type Env } from "../../src/domain/install";

const UA = {
  iphoneSafari26:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  iphoneSafari18:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0 (iPhone15,2; iOS 18_6; en_US)",
  iphoneWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidFirefox:
    "Mozilla/5.0 (Android 15; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  windowsFirefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
};

const env = (ua: string, more: Partial<Env> = {}): Env => ({
  ua,
  touchPoints: 0,
  standalone: false,
  canPrompt: false,
  ...more,
});

describe("installWay", () => {
  it.each([
    [UA.iphoneSafari26, "ios-safari"],
    [UA.iphoneSafari18, "ios-safari-legacy"],
    [UA.iphoneChrome, "ios-chrome"],
    [UA.iphoneInstagram, "ios-elsewhere"],
    [UA.iphoneWebView, "ios-elsewhere"],
    [UA.androidChrome, "android-menu"],
    [UA.androidFirefox, "android-menu"],
    [UA.macSafari, "mac-safari"],
    [UA.macChrome, "desktop-menu"],
    [UA.windowsFirefox, "unsupported"],
  ])("reads %s as %s", (ua, way) => {
    expect(installWay(env(ua))).toBe(way);
  });

  it("treats an iPad asking for the desktop site as an iPhone", () => {
    expect(installWay(env(UA.ipadDesktopMode, { touchPoints: 5 }))).toBe(
      "ios-safari",
    );
  });

  it("offers the one tap install whenever the browser has one", () => {
    expect(installWay(env(UA.androidChrome, { canPrompt: true }))).toBe(
      "prompt",
    );
    expect(installWay(env(UA.macChrome, { canPrompt: true }))).toBe("prompt");
  });

  it("has nothing to do once installed", () => {
    expect(installWay(env(UA.iphoneSafari26, { standalone: true }))).toBe(
      "installed",
    );
  });
});

describe("stepsFor", () => {
  it("shows the browser in hand on its own device", () => {
    expect(stepsFor("iphone", "ios-chrome", "iphone")[0]!.scene).toBe(
      "chrome-ios-bar",
    );
  });

  it("shows Safari for an iPhone picked from another device", () => {
    expect(
      stepsFor("iphone", "desktop-menu", "computer").map((s) => s.scene),
    ).toEqual([
      "safari-bar",
      "safari-menu",
      "share-sheet",
      "add-dialog",
      "home-screen",
    ]);
  });

  it("falls back to Safari steps when the iPhone browser cannot install", () => {
    expect(stepsFor("iphone", "ios-elsewhere", "iphone")[0]!.scene).toBe(
      "safari-bar",
    );
  });

  it("ends every phone guide on the home screen", () => {
    for (const device of ["iphone", "android"] as const)
      expect(stepsFor(device, "unsupported", "computer").at(-1)!.scene).toBe(
        "home-screen",
      );
  });
});
