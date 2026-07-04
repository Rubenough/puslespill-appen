import { parseOAuthRedirect } from "../auth";

const ACCESS = "access-123";
const REFRESH = "refresh-456";

describe("parseOAuthRedirect", () => {
  it("trekker ut begge tokens fra fragmentet", () => {
    const url = `puslespill://auth/callback#access_token=${ACCESS}&refresh_token=${REFRESH}&token_type=bearer`;
    expect(parseOAuthRedirect(url)).toEqual({
      access_token: ACCESS,
      refresh_token: REFRESH,
    });
  });

  it("er upåvirket av rekkefølge og ekstra parametere", () => {
    const url = `x://cb#expires_in=3600&refresh_token=${REFRESH}&access_token=${ACCESS}`;
    expect(parseOAuthRedirect(url)).toEqual({
      access_token: ACCESS,
      refresh_token: REFRESH,
    });
  });

  it("returnerer null når fragmentet mangler", () => {
    expect(parseOAuthRedirect("puslespill://auth/callback")).toBeNull();
  });

  it("returnerer null når et token mangler", () => {
    expect(parseOAuthRedirect(`x://cb#access_token=${ACCESS}`)).toBeNull();
    expect(parseOAuthRedirect(`x://cb#refresh_token=${REFRESH}`)).toBeNull();
  });

  it("returnerer null for tomt fragment", () => {
    expect(parseOAuthRedirect("x://cb#")).toBeNull();
  });
});
