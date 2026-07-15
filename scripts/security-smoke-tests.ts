import { DELETE } from "@/app/api/upload/route";
import { inspectUploadImage } from "@/lib/security/upload-inspection";
import { checkRateLimit } from "@/lib/security/rate-limit";

function fileFrom(buffer: Buffer, type: string, name: string) {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new File([arrayBuffer], name, { type });
}

function jpegBuffer() {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11,
    0x08,
    0x00, 0x64,
    0x00, 0x64,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9
  ]);
}

function pngBuffer() {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(100, 16);
  buffer.writeUInt32BE(100, 20);
  return buffer;
}

function webpBuffer() {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer[24] = 99;
  buffer[27] = 99;
  return buffer;
}

async function expectPass(label: string, file: File) {
  await inspectUploadImage(file, "work");
  console.log(`PASS ${label}`);
}

async function expectReject(label: string, file: File) {
  try {
    await inspectUploadImage(file, "work");
    throw new Error(`${label} should have been rejected`);
  } catch {
    console.log(`PASS ${label}`);
  }
}

async function main() {
  await expectPass("valid jpeg", fileFrom(jpegBuffer(), "image/jpeg", "photo.php"));
  await expectPass("valid png", fileFrom(pngBuffer(), "image/png", "photo.txt"));
  await expectPass("valid webp", fileFrom(webpBuffer(), "image/webp", "photo.bin"));
  await expectReject("svg rejected", fileFrom(Buffer.from("<svg></svg>"), "image/svg+xml", "x.svg"));
  await expectReject("html disguised as jpeg rejected", fileFrom(Buffer.from("<script>alert(1)</script>"), "image/jpeg", "x.jpg"));

  const deleteResponse = await DELETE();
  if (deleteResponse.status !== 405) throw new Error("upload DELETE should return 405");
  console.log("PASS upload DELETE returns 405");

  const key = `security-smoke:${Date.now()}`;
  checkRateLimit(key, { windowMs: 60_000, limit: 2 });
  checkRateLimit(key, { windowMs: 60_000, limit: 2 });
  const limited = checkRateLimit(key, { windowMs: 60_000, limit: 2 });
  if (!limited.limited || limited.retryAfter <= 0) throw new Error("rate limit should block third request");
  console.log("PASS rate limit returns retry window");
}

main().catch((error) => {
  console.error("Security smoke tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
});
