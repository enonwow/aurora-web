export const NWN_ERF_RESOURCE_EXTENSIONS: Readonly<Record<number, string>> =
  Object.freeze({
    1: "bmp",
    3: "tga",
    4: "wav",
    6: "plt",
    7: "ini",
    8: "bmu",
    10: "txt",
    11: "mp3",
    2002: "mdl",
    2009: "nss",
    2010: "ncs",
    2012: "are",
    2013: "set",
    2014: "ifo",
    2015: "bic",
    2016: "wok",
    2017: "2da",
    2022: "txi",
    2023: "git",
    2025: "uti",
    2027: "utc",
    2029: "dlg",
    2030: "itp",
    2032: "utt",
    2033: "dds",
    2035: "uts",
    2036: "ltr",
    2037: "gff",
    2038: "fac",
    2040: "ute",
    2042: "utd",
    2044: "utp",
    2045: "dft",
    2046: "gic",
    2047: "gui",
    2051: "utm",
    2052: "dwk",
    2053: "pwk",
    2056: "jrl",
    2058: "utw",
    2060: "ssf",
    2072: "mtr",
  });

const RESOURCE_TYPES_BY_EXTENSION = new Map<string, number>(
  Object.entries(NWN_ERF_RESOURCE_EXTENSIONS).map(([type, extension]) => [
    extension,
    Number(type),
  ]),
);

export function nwnErfResourceExtension(resourceType: number): string {
  return NWN_ERF_RESOURCE_EXTENSIONS[resourceType] ?? `r${resourceType}`;
}

export function nwnErfResourceTypeForFileName(fileName: string): number | null {
  const match = /\.([^.\/]+)$/u.exec(fileName.trim());
  if (!match) {
    return null;
  }
  const extension = match[1].toLowerCase();
  const known = RESOURCE_TYPES_BY_EXTENSION.get(extension);
  if (known !== undefined) {
    return known;
  }
  const rawType = /^r(\d{1,5})$/u.exec(extension);
  if (!rawType) {
    return null;
  }
  const parsed = Number(rawType[1]);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65_535
    ? parsed
    : null;
}
