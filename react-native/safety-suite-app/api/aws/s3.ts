const AWSSDK = require('aws-sdk/dist/aws-sdk-react-native');
import type S3 from 'aws-sdk/clients/s3';
import { SECRET_KEY, ACCESS_KEY, REGION } from './aws';
import * as RNFS from 'react-native-fs';
import { encode } from 'base64-arraybuffer';
import { CachesDirectoryPath } from 'react-native-fs';
import { Buffer } from 'buffer';
import MD5 from 'crypto-js/md5';

//constants
const BUCKET = '';

const TypedS3: S3 = AWSSDK.S3 as unknown as S3;

// s3 client
export const s3: S3 = new TypedS3({
  region: REGION,
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  correctClockSkew: true, // Needed to fix RequestTimeTooSkewed errors
});

export const getInlineBase64Str = (type: string, base64: string) => {
  return `data:${type};base64,${base64}`;
};

export type UploadToS3Payload = {
  Bucket: string;
  Key: string;
  ContentType: string;
  Body: Buffer;
};

export type UploadToS3Return = {
  Bucket: string;
  ETag: string;
  Key: string;
  Location: string;
  ServerSideEncryption: string;
  key: string;
};

export type GetS3Return = {
  Body: Buffer;
  Key: string;
  key?: string;
};

export type S3AttachmentParams = {
  file: string;
  binaryFile: Buffer;
};

export const hashFileS3 = async (file: string): Promise<string> => {
  return MD5(file).toString();
};

// ---------------------------------------- s3 functions ----------------------------------------

/**
 *
 * @param path   full file path to save to
 * @param base64 file data as base64 string
 *
 * @summary write file data to local cache directory
 */
export const writeFileLocally = async (path: string, base64: string): Promise<void> => {
  await RNFS.writeFile(path, base64.replace('data:image/png;base64,', ''), 'base64');
};

export type S3GetPayload = {
  file: string;
  customerId: number;
};

export type S3GetReturn = {
  success: boolean;
  data: string | null; // as base64 string
};

/**
 *
 * @param props - key for s3 file
 * @returns as S3GetReturn defined above
 *
 * get an s3 obj,
 * if it exists will download locally using the cache dir defined by React native FS
 * and will use the same s3 key as the path
 */
export const s3getObject = async (params: S3GetPayload): Promise<S3GetReturn> => {
  const key = `${params.customerId}/${params.file}`;
  const localPath = `${CachesDirectoryPath}/${params.file}`;

  const getObjectCommand: { Bucket: string; Key: string } = {
    Bucket: BUCKET,
    Key: key,
  };

  try {
    const exists = await RNFS.exists(localPath).catch(() => false);

    if (exists) {
      const base64 = await RNFS.readFile(localPath, 'base64');
      return { success: true, data: base64 };
    }

    const res: GetS3Return = await s3.getObject(getObjectCommand).promise();
    const buffer: Buffer | null = res.Body ? res.Body : null;
    const base64: string | null = buffer ? encode(buffer) : null;

    if (base64) {
      // download file locally at download fpath
      await writeFileLocally(localPath, base64);
      return { success: true, data: base64 };
    }

    return { success: false, data: 'ERROR: Empty image data, could not save locally' };
  } catch (error) {
    console.error('Unable to load image', error);
    return { success: false, data: error };
  }
};

export type S3UploadPayload = {
  key: string;
  data: Buffer;
};

export const s3Upload = (params: S3UploadPayload): Promise<UploadToS3Return> => {
  const payload: UploadToS3Payload = {
    Bucket: BUCKET,
    Key: params.key,
    Body: params.data,
    ContentType: 'application/x-binary',
  };

  return s3.upload(payload).promise() as Promise<UploadToS3Return>;
};

export const checkFileExistsInS3 = async (key: string): Promise<boolean> => {
  const params = {
    Bucket: BUCKET,
    Key: key,
  };

  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    return false;
  }
};
