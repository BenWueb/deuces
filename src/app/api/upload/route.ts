import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  IMAGE_EXTENSIONS,
  uploadFileSchema,
  toValidationFailure,
} from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = uploadFileSchema.safeParse(formData.get("file"));

  if (!parsed.success) {
    return NextResponse.json(toValidationFailure(parsed.error), {
      status: 400,
    });
  }

  const file = parsed.data;
  const extension = IMAGE_EXTENSIONS[file.type];

  // The stored name is generated, so nothing user-supplied reaches the path.
  const key = `courts/${session.user.id}/${randomUUID()}${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  }

  // Local disk fallback so uploads work before a blob store is set up.
  // Serverless filesystems are read-only and ephemeral, so this is dev-only.
  try {
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    const destination = path.join(uploadsRoot, key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${key}` });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save the image locally. Set BLOB_READ_WRITE_TOKEN to upload to Vercel Blob instead.",
      },
      { status: 500 },
    );
  }
}
