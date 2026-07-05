import React, { type ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { ThemeProvider, useTheme, THEME_KEY } from "../ThemeContext";

// Mock persistering og NativeWind sin imperative fargeskjema-setter.
// jest.mock() heises over importene, så fabrikkene kan bare referere
// variabler med "mock"-prefiks.
const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string]>();
const mockColorSchemeSet = jest.fn<void, [string]>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) => mockGetItemAsync(key),
  setItemAsync: (key: string, value: string) => mockSetItemAsync(key, value),
}));

jest.mock("nativewind", () => ({
  colorScheme: { set: (value: string) => mockColorSchemeSet(value) },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockGetItemAsync.mockReset();
  mockSetItemAsync.mockReset().mockResolvedValue(undefined);
  mockColorSchemeSet.mockReset();
});

describe("ThemeContext", () => {
  it("laster lagret preferanse og påfører den", async () => {
    mockGetItemAsync.mockResolvedValue("dark");

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.preference).toBe("dark");
    expect(mockColorSchemeSet).toHaveBeenCalledWith("dark");
  });

  it("faller tilbake til 'system' når ingenting er lagret", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.preference).toBe("system");
    expect(mockColorSchemeSet).toHaveBeenCalledWith("system");
  });

  it("ignorerer ugyldig lagret verdi og bruker 'system'", async () => {
    mockGetItemAsync.mockResolvedValue("tulleverdi");

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.preference).toBe("system");
    expect(mockColorSchemeSet).toHaveBeenCalledWith("system");
  });

  it("faller tilbake til 'system' når lesing kaster", async () => {
    mockGetItemAsync.mockRejectedValue(new Error("secure store nede"));

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.preference).toBe("system");
    expect(mockColorSchemeSet).toHaveBeenCalledWith("system");
  });

  it("påfører og lagrer ved setPreference", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    mockColorSchemeSet.mockClear();

    await act(async () => {
      result.current.setPreference("light");
    });

    expect(result.current.preference).toBe("light");
    expect(mockColorSchemeSet).toHaveBeenCalledWith("light");
    expect(mockSetItemAsync).toHaveBeenCalledWith(THEME_KEY, "light");
  });
});
