import { toStoragePath } from "../sessionImages";

describe("toStoragePath", () => {
  it("returnerer null for tom verdi", () => {
    expect(toStoragePath(null)).toBeNull();
    expect(toStoragePath("")).toBeNull();
  });

  it("lar en ren lagringssti stå urørt", () => {
    expect(toStoragePath("user-1/session-2/123.jpg")).toBe("user-1/session-2/123.jpg");
  });

  it("trekker ut stien fra en full offentlig URL", () => {
    const url =
      "https://example.supabase.co/storage/v1/object/public/session-images/user-1/123.jpg";
    expect(toStoragePath(url)).toBe("user-1/123.jpg");
  });

  it("fjerner query-strengen fra en signert URL", () => {
    const signed =
      "https://example.supabase.co/storage/v1/object/sign/session-images/user-1/session-2/123.jpg?token=abc.def";
    expect(toStoragePath(signed)).toBe("user-1/session-2/123.jpg");
  });
});
