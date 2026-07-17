import {
  buildBlobObjectHttpUrl,
  buildS3ObjectUrl
} from "../../src/common/blob/blob-url.helpers";

describe("blob url helpers", () => {
  it("builds s3 url and strips leading slash from object key", () => {
    expect(buildS3ObjectUrl("aurora-module-assets", "/modules/current/a.bin")).toBe(
      "s3://aurora-module-assets/modules/current/a.bin"
    );
  });

  it("builds path-style blob url with encoded segments", () => {
    const url = buildBlobObjectHttpUrl(
      {
        endpoint: "http://seaweedfs:8333/",
        bucket: "aurora module assets",
        forcePathStyle: true
      },
      "/modules/current/tiles/atlas city.webp"
    );

    expect(url).toBe(
      "http://seaweedfs:8333/aurora%20module%20assets/modules/current/tiles/atlas%20city.webp"
    );
  });

  it("builds non path-style blob url", () => {
    const url = buildBlobObjectHttpUrl(
      {
        endpoint: "http://seaweedfs:8333/",
        bucket: "aurora-module-assets",
        forcePathStyle: false
      },
      "modules/current/audio/amb.ogg"
    );

    expect(url).toBe("http://seaweedfs:8333/modules/current/audio/amb.ogg");
  });
});
