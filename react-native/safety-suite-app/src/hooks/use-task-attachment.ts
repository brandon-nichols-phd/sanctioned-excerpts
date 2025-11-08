import { useCallback, useMemo } from 'react';
import { CachesDirectoryPath, copyFile, exists } from 'react-native-fs';
import {
  Asset,
  CameraOptions,
  ImageLibraryOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { useSelector } from 'react-redux';

import { State } from '../../store/types/store-types';
import { hashFileS3 } from '../../api/aws/s3';
import { S3Attachment, Task, TaskType } from '../data/task';

const copyLocalFileToRN = async (uri: string) => {
  const fname = uri.split('/').pop() || uri;
  const cachePath = CachesDirectoryPath + '/' + fname;
  const fileExists = await exists(cachePath);
  if (fileExists) {
    return cachePath;
  }

  await copyFile(uri, cachePath);
  return cachePath;
};

/**
 * 	- dispatch attachment to store
 *  - upload to BE
 *  - upload to s3
 */
export const useTaskAttachment = ({
  task,
  saveTask,
  uploadAttachment,
}: {
  task: Task;
  saveTask: (task: Task) => Task;
  uploadAttachment: (attachment: S3Attachment) => void;
}) => {
  const currUser = useSelector((state: State) => state.user.currUser);
  const customerId = useSelector((state: State) => state.context.customerId);

  const addToAttachments = useCallback(
    async (assets: Asset[]) => {
      try {
        // Save all files locally and prepare attachments
        const newAttachments = await Promise.all(
          assets
            .filter((asset) => asset.type && asset.uri)
            .map(async (asset) => {
              const uri = asset.uri ?? '';
              const file = uri.split('://').pop() || '';
              const fileKey = file.split('/').pop() || '';

              await copyLocalFileToRN(uri);
              const hash = await hashFileS3(fileKey);

              return {
                customerId: customerId || -1,
                file: fileKey,
                uri: uri,
                hash: hash,
                type: asset.type ?? '',
                addedby: currUser?.id ?? null,
                addedWhen: Date.now(),
              };
            })
        );

        const allAttachments = [...(task.attachments || []), ...newAttachments];

        saveTask({
          ...task,
          attachments: allAttachments,
          flag: task.flag || false,
          completed: task.type === TaskType.PICTURE ? true : task.completed,
          taskResponse: task.type === TaskType.PICTURE ? 'completed' : task.taskResponse,
        });

        await Promise.all(
          newAttachments.map((attachment) => uploadAttachment(attachment))
        );
      } catch (error) {
        console.error('[useTaskAttachment] ERROR adding attachment: ', error);
        throw error;
      }
    },
    [currUser, saveTask, uploadAttachment, task, customerId]
  );

  /** remove attachments from task in store && be */
  const removeTaskAttachment = useCallback(
    (attachment: S3Attachment) => {
      const filteredAttachments = task.attachments.filter(
        (att) => att.file !== attachment.file && att.hash !== attachment.hash
      );

      const isPictureTask: boolean = task.type === TaskType.PICTURE;
      const isComplete: boolean = isPictureTask
        ? filteredAttachments.length > 0
        : task.completed;

      saveTask({
        ...task,
        attachments: filteredAttachments,
        flag: task.flag || false,
        completed: isComplete,
        taskResponse: isComplete && isPictureTask ? 'completed' : task.taskResponse,
      });
    },
    [saveTask, task]
  );

  /**
   * @summary takes picture from device camera and adds to task attachments
   */
  const takePicture = useCallback(() => {
    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'back',
      saveToPhotos: true,
      maxWidth: 0, // Using 0 makes the image the full size
      maxHeight: 0,
      quality: 0.1,
    };

    launchCamera(options)
      .then((res) => {
        if (res.assets?.length) {
          return addToAttachments(res.assets);
        } else {
          return Promise.reject('No Assets Found');
        }
      })
      .catch((error) => {
        console.error('[Editor.takePicture] ERROR taking a picture in res ', error);
      });
  }, [addToAttachments]);

  const imgFromLibrary = useCallback(() => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.1,
      selectionLimit: 0,
    };

    launchImageLibrary(options)
      .then((res) => {
        if (res.assets?.length) {
          return addToAttachments(res.assets);
        } else {
          return Promise.reject('No Assets Found');
        }
      })
      .catch((error) => {
        console.error(
          '[Editor.imgFromLibrary] ERROR adding a picture from library ',
          error
        );
      });
  }, [addToAttachments]);

  return useMemo(() => {
    return { takePicture, imgFromLibrary, removeTaskAttachment };
  }, [takePicture, imgFromLibrary, removeTaskAttachment]);
};
