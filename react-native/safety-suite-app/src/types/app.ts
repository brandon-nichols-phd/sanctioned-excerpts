export interface ApiLocation {
  additionalPermissions: PermissionSet | null;
  appAccess: AppAccess;
  departments: ApiDepartment[];
  jobActive: boolean;
  jobId: number;
  jobName: Roles;
  locationId: number;
  locationName: string;
  permissionSet: PermissionSet;
  printerConfig: ApiPrinterConfig;
  protoFeatureFlags?: ProtoFeatureOptions;
}

export interface ApiPrinterConfig {
  id: number;
  locationId: number;
  printerBrand: string;
  printerConnection: string;
}
/**
 * each app tab or page listed here
 */
export enum AppPage {

}

export enum Roles {

}

export interface LocationModel {
  locationId: Location;
}

export type LocationPrinterConfig = {
  id: number;
  locationId: number;
  printerBrand: string;
  printerConnection: string;
};

export interface Department {
  id: number;
  name: string;
}

export interface ApiDepartment {
  departmentId: number;
  departmentName: string;
}

export type ProtoFeatureOptions = {
  usePrintQueue?: boolean;
  includeAdhocFilter?: boolean;
};

export interface Location {
  locationId: number;
  locationName: string;
  permissions: Permissions;
  jobId: number;
  jobName: Roles;
  jobActive: boolean;
  protoFeatureFlags?: ProtoFeatureOptions;
  printerConfig: LocationPrinterConfig | null;
  departments: Department[];
}

export interface Permissions {
  permissions: PermissionSet;
  additionalPermissions: PermissionSet | null;
  appAccess: AppAccess;
}

export interface AppAccess {
  notes: boolean | null;
  tasks: boolean | null;
  labels: boolean | null;
  messages: boolean | null;
  reports: boolean | null;
  settings: boolean | null;
  devices: boolean | null;
  users: boolean | null;
  digitalprep: boolean | null;
}

export interface ListObject {
  label: string;
  value: number | string;
}

export interface AppDate {
  epoch: number | string;
  str: string;
}


export type RoleListType = {
  [role in Roles]: boolean;
};


export interface Attachment {
  uri: string;
  isVoiceMessage: boolean; // used bc this is added to global Note.attachments obj[]
  file: string; // file name
  name?: string; // for voice messges : user entered name
  dateAdded?: string;
  addedWhen: number;
  hash: string;
  addedBy?: number;
  customerId: number;
  type: string;
}
export enum ToastTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export type Job = {
  id: number;
  name: string;
  permissions: PermissionSet;
};

export type ApiJobs = {
  id: number;
  name: string;
  permissionSet: PermissionSet;
};
