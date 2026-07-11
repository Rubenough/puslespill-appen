import { resolveAvatarUrl, resolveAvatarUrls, resolveProfileAvatars } from "../avatar";
import { getSignedUrl, getSignedUrls } from "../sessionImages";

jest.mock("../sessionImages", () => ({
  getSignedUrl: jest.fn(),
  getSignedUrls: jest.fn(),
}));

const mockedGetSignedUrl = getSignedUrl as jest.Mock;
const mockedGetSignedUrls = getSignedUrls as jest.Mock;

beforeEach(() => {
  mockedGetSignedUrl.mockReset();
  mockedGetSignedUrls.mockReset();
  mockedGetSignedUrl.mockImplementation(async (v: string) => `signed:${v}`);
  mockedGetSignedUrls.mockImplementation(
    async (values: string[]) => new Map(values.map((v) => [v, `signed:${v}`])),
  );
});

describe("resolveAvatarUrl", () => {
  it("lar https-URL-er (Google-avatarer) passere urørt", async () => {
    const url = "https://lh3.googleusercontent.com/a/foo";
    expect(await resolveAvatarUrl(url)).toBe(url);
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });

  it("signerer lagringsstier", async () => {
    expect(await resolveAvatarUrl("user-1/avatar/123.jpg")).toBe(
      "signed:user-1/avatar/123.jpg",
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledWith("user-1/avatar/123.jpg");
  });

  it("returnerer null for null/undefined", async () => {
    expect(await resolveAvatarUrl(null)).toBeNull();
    expect(await resolveAvatarUrl(undefined)).toBeNull();
  });
});

describe("resolveAvatarUrls", () => {
  it("blander passthrough og batch-signering", async () => {
    const google = "https://lh3.googleusercontent.com/a/foo";
    const path = "user-1/avatar/1.jpg";
    const result = await resolveAvatarUrls([google, path, null]);

    expect(result.get(google)).toBe(google);
    expect(result.get(path)).toBe(`signed:${path}`);
    expect(mockedGetSignedUrls).toHaveBeenCalledWith([path]);
  });

  it("hopper over signering når alt er https", async () => {
    const url = "https://example.com/a.jpg";
    const result = await resolveAvatarUrls([url]);
    expect(result.get(url)).toBe(url);
    expect(mockedGetSignedUrls).not.toHaveBeenCalled();
  });

  it("utelater verdier som ikke kunne signeres", async () => {
    mockedGetSignedUrls.mockResolvedValue(new Map());
    const result = await resolveAvatarUrls(["user-1/avatar/1.jpg"]);
    expect(result.size).toBe(0);
  });
});

describe("resolveProfileAvatars", () => {
  it("bytter avatar_url til visbar URL per rad", async () => {
    const rows = [
      { id: "a", avatar_url: "https://example.com/a.jpg" },
      { id: "b", avatar_url: "user-b/avatar/2.jpg" },
      { id: "c", avatar_url: null },
    ];
    const resolved = await resolveProfileAvatars(rows);
    expect(resolved).toEqual([
      { id: "a", avatar_url: "https://example.com/a.jpg" },
      { id: "b", avatar_url: "signed:user-b/avatar/2.jpg" },
      { id: "c", avatar_url: null },
    ]);
  });
});
