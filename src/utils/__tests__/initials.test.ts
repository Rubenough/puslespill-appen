import { getInitials, getAvatarColor } from "../initials";

describe("getInitials", () => {
  it("returnerer ? for tom/null verdi", () => {
    expect(getInitials(null)).toBe("?");
    expect(getInitials("")).toBe("?");
  });

  it("tar første bokstav i de to første ordene, i store bokstaver", () => {
    expect(getInitials("Kari Nordmann")).toBe("KN");
    expect(getInitials("ola")).toBe("O");
  });

  it("ignorerer navn utover de to første ordene", () => {
    expect(getInitials("Anne Berit Cecilie")).toBe("AB");
  });
});

describe("getAvatarColor", () => {
  it("er deterministisk for samme navn", () => {
    expect(getAvatarColor("Kari Nordmann")).toEqual(getAvatarColor("Kari Nordmann"));
  });

  it("returnerer et farvepar med bg og text", () => {
    const color = getAvatarColor("Ola");
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("text");
  });

  it("gir et gyldig farvepar også for null", () => {
    const color = getAvatarColor(null);
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("text");
  });
});
