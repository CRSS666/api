interface RequestFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  stream: ReadableStream;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export default RequestFile;
