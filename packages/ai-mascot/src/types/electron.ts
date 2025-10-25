export interface ElectronAPI {
  setWindowIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void;
}

export type ElectronWindow = Window & {
  electron?: ElectronAPI;
};
