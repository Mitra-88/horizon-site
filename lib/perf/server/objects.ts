import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface CaptureObjects {
  put(id: string, bytes: Uint8Array): Promise<void>;
  get(id: string): Promise<Uint8Array>;
  delete(id: string): Promise<void>;
}

export class S3CaptureObjects implements CaptureObjects {
  private readonly client: S3Client;
  private readonly bucket: string;
  private ready: Promise<void> | undefined;

  constructor() {
    const { PERF_S3_ENDPOINT, PERF_S3_BUCKET, PERF_S3_ACCESS_KEY, PERF_S3_SECRET_KEY } = process.env;
    if (!PERF_S3_ENDPOINT || !PERF_S3_BUCKET || !PERF_S3_ACCESS_KEY || !PERF_S3_SECRET_KEY) {
      throw new Error("PERF_S3_ENDPOINT, PERF_S3_BUCKET, PERF_S3_ACCESS_KEY and PERF_S3_SECRET_KEY are required");
    }
    this.bucket = PERF_S3_BUCKET;
    this.client = new S3Client({
      endpoint: PERF_S3_ENDPOINT,
      region: process.env.PERF_S3_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId: PERF_S3_ACCESS_KEY, secretAccessKey: PERF_S3_SECRET_KEY },
      requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 },
    });
  }

  private async ensureBucket(): Promise<void> {
    this.ready ??= this.client.send(new CreateBucketCommand({ Bucket: this.bucket })).then(() => undefined).catch((error: unknown) => {
      if (error instanceof Error && ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(error.name)) return;
      this.ready = undefined;
      throw error;
    });
    await this.ready;
  }

  async put(id: string, bytes: Uint8Array): Promise<void> {
    await this.ensureBucket();
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: `${id}.hzperf`, Body: bytes, ContentType: "application/vnd.horizon.perf" }));
  }

  async get(id: string): Promise<Uint8Array> {
    const reply = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: `${id}.hzperf` }));
    if (!reply.Body) throw new Error("Capture object is empty");
    return reply.Body.transformToByteArray();
  }

  async delete(id: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${id}.hzperf` }));
  }
}
