// Static audio assets are bundled by Metro and resolve to an asset module id.
declare module '*.wav' {
  const asset: number;
  export default asset;
}
