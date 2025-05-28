import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';

class Storage {
  private client = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!
    }
  });

  /**
   * Upload an object to the s3 storage.
   *
   * @param key The object's key.
   * @param mimeType The object's mime type.
   * @param buffer The object's content.
   */
  async upload(key: string, mimeType: string, buffer: Buffer) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType
      })
    );
  }

  /**
   * Remove an object from the s3 storage.
   *
   * @param key The object's key.
   */
  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key
      })
    );
  }

  /**
   * Move an object in the s3 storage.
   *
   * @param key The object's current key.
   * @param newKey The object's new key.
   */
  async move(key: string, newKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        CopySource: key,
        Key: newKey
      })
    );

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key
      })
    );
  }
}

const s3 = new Storage();
export default s3;

export { s3 };
