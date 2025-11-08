import { ApiJobs, Job, ListObject } from '../src/types/app';
import { ApiParams, ApiResponse, JOBS, JWT } from './constants';
import { API_RESP_JSON, decodeApiRes } from './utils';

/** api */
export const getJobsApi = async (params: any) => {
  const url: string = JOBS(params);
  try {
    const res: any = await fetch(url, {
      method: 'get',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
    });
    const contentType: any = res.headers.get('Content-Type');
    if (contentType == API_RESP_JSON && res.status >= 200) {
      const json: any = await res.json();
      const decodedData: any = decodeApiRes(json.data);
      return { status: res.status, data: decodedData };
    } else {
      const decodedData: any = res.data ? decodeApiRes(res.data) : undefined;
      return { status: 400, data: decodedData };
    }
  } catch (e) {
    console.error('[getJobs] ', e);
    return { status: 400, data: null };
  }
};

/** api calls */
export const getJobs = async (params: ApiParams): Promise<ApiResponse<ApiJobs[]>> => {
  return await getJobsApi(params);
};

export const mapApiJobs = (jobs: ApiJobs[]): Job[] => {
  return jobs.map((job: ApiJobs) => {
    return {
      id: job.id,
      name: job.name,
      permissions: job.permissionSet,
    };
  });
};

export const mapJobsToOptions = (jobs: Job[]) => {
  return jobs.reduce((opts: ListObject[], job: Job) => {
    if (job.id) {
      opts.push({
        label: job.name,
        value: job.id,
      });
    }
    return opts;
  }, []);
};
