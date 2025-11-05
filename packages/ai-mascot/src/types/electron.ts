export interface ElectronAPI {
  setWindowIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void;
  moveWindow: (deltaX: number, deltaY: number) => void;
}

export type ElectronWindow = Window & {
  electron?: ElectronAPI;
};
