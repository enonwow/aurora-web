import {
  applyBinaryPayloadHeaders,
  sanitizeHeaderFileName,
  setInlineContentDisposition
} from "../../src/common/http/binary-response";

describe("binary response helpers", () => {
  it("applies default binary headers including content length and etag", () => {
    const response = createReply();

    applyBinaryPayloadHeaders(
      response as any,
      {
        contentType: "application/octet-stream",
        size: 4,
        etag: "etag-1"
      },
      {
        cacheControl: "private, max-age=120",
        extraHeaders: {
          "X-Test": "value",
          "X-Empty": ""
        }
      }
    );

    expect(response.header).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    expect(response.header).toHaveBeenCalledWith("Content-Length", "4");
    expect(response.header).toHaveBeenCalledWith("Cache-Control", "private, max-age=120");
    expect(response.header).toHaveBeenCalledWith("ETag", "etag-1");
    expect(response.header).toHaveBeenCalledWith("X-Test", "value");
    expect(response.header).toHaveBeenCalledWith("X-Empty", "");
  });

  it("skips content length and undefined extra headers when requested", () => {
    const response = createReply();

    applyBinaryPayloadHeaders(
      response as any,
      {
        contentType: "audio/ogg",
        size: 10
      },
      {
        includeContentLength: false,
        extraHeaders: {
          "X-Defined": "yes",
          "X-Skipped": undefined
        }
      }
    );

    expect(response.header).toHaveBeenCalledWith("Content-Type", "audio/ogg");
    expect(response.header).toHaveBeenCalledWith("X-Defined", "yes");
    expect(response.header).not.toHaveBeenCalledWith("Content-Length", expect.anything());
    expect(response.header).not.toHaveBeenCalledWith("X-Skipped", expect.anything());
  });

  it("sets sanitized inline content disposition filename", () => {
    const response = createReply();
    setInlineContentDisposition(response as any, "bad\"name\\line\r\n.ogg");
    expect(response.header).toHaveBeenCalledWith(
      "Content-Disposition",
      "inline; filename=\"bad_name_line__.ogg\""
    );
  });

  it("sanitizes file names consistently", () => {
    expect(sanitizeHeaderFileName("ok-file.bin")).toBe("ok-file.bin");
    expect(sanitizeHeaderFileName("a\"b\\c\rd\ne")).toBe("a_b_c_d_e");
  });
});

function createReply() {
  return {
    header: jest.fn()
  };
}
