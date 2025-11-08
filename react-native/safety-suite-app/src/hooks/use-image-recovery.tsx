import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import * as RNFS from 'react-native-fs';
import moment from 'moment';

import { OfflineTaskActions, State } from '../../store/types/store-types';
import { addToOfflineQueue } from '../../store/slices/taskSlice';
import { checkFileExistsInS3 } from '../../api/aws/s3';

// This is meant to run once a day and backup any images we find in the local cache
export const useImageRecovery = () => {
  const dispatch = useDispatch();
  const customerId = useSelector((state: State) => state.context.customerId);
  const [lastRunDate, setLastRunDate] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (lastRunDate != null && moment(lastRunDate).isSame(moment(), 'day')) {
        // We only want to run this once a day
        return;
      }

      const directoryPath = RNFS.CachesDirectoryPath;
      RNFS.readDir(directoryPath)
        .then(async (result) => {
          const fortyFiveDaysAgo = moment().subtract(45, 'days');

          const images = result.filter((file) => {
            const isImage = /\.(png|jpg)$/i.test(file.name);
            const fileCreationTime = moment(file.ctime ?? file.mtime);

            return isImage && fileCreationTime.isAfter(fortyFiveDaysAgo);
          });

          console.warn(`Found ${images.length} images to potentially recover`, {
            cachedImages: images.map((f) => f.name),
          });
          const uploadTasks = images.map(async (file) => {
            const fileKey = `backup-cache-${file.name}`;
            const existsInS3 = await checkFileExistsInS3(`${customerId}/${fileKey}`);

            if (!existsInS3) {
              const s3AttachmentData = {
                file: fileKey,
                uri: file.path,
                type: 'image',
              };

              const s3Params = {
                customerId: customerId,
                attData: s3AttachmentData,
              };

              return {
                type: OfflineTaskActions.ATTACHMENTS_S3,
                taskId: '-1', // Not used
                params: s3Params,
              };
            }
            return null;
          });

          const results = await Promise.all(uploadTasks);

          setLastRunDate(new Date());

          results.forEach((task) => {
            if (task !== null) {
              dispatch(addToOfflineQueue(task));
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });
    }, [dispatch, customerId, lastRunDate])
  );
};
