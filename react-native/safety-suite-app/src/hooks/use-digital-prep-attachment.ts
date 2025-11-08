import { useState, useEffect } from 'react';
import { Image } from 'react-native';
import { CachesDirectoryPath, writeFile, mkdir, exists } from 'react-native-fs';
import { encode } from 'base64-arraybuffer';

import { s3 } from '../../api/aws/s3';

const BUCKET = 'digitalprepattachments';
const LOCAL_DIR = 'digitalprepattachments';

const s3getObject = async (key: string) => {
  const getObjectCommand = {
    Bucket: BUCKET,
    Key: key,
  };

  const res = await s3.getObject(getObjectCommand).promise();
  const base64 = res.Body ? encode(res.Body) : null;

  if (!base64) {
    throw new Error('Did not encode the image');
  }

  return base64;
};

const getDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      url,
      (width, height) => {
        resolve({ width, height });
      },
      reject
    );
  });
};

export type ImageWithDimensions = {
  url: string;
  width: number;
  height: number;
};

export const useDigitalPrepAttachment = (pictureKey: string | null) => {
  const [image, setImage] = useState<ImageWithDimensions | null>(null);

  useEffect(() => {
    const load = async () => {
      if (pictureKey == null) {
        return null;
      }
      const dirPath = `${CachesDirectoryPath}/${LOCAL_DIR}`;
      const filePath = `${dirPath}/${pictureKey}`;
      const fileExistsLocally = await exists(filePath);

      if (!fileExistsLocally) {
        const imageBase64 = await s3getObject(pictureKey);
        const dirExists = await exists(dirPath);
        if (!dirExists) {
          await mkdir(dirPath);
        }

        await writeFile(
          filePath,
          imageBase64.replace('data:image/png;base64,', ''),
          'base64'
        );
      }

      const dimensions = await getDimensions(filePath);

      setImage({ url: filePath, ...dimensions });
    };

    load().catch((error) => {
      console.error(error);
    });
  }, [pictureKey]);
  return image;
};
