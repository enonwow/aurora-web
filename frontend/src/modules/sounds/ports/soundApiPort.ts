import type {
  SoundApiAudioContractsResult,
  SoundApiDeliveryMode,
  SoundApiListQuery,
  SoundApiListResult,
  SoundApiProcessPayload,
  SoundApiProcessResult
} from "../contracts";

export interface SoundApiPort {
  listSounds(accessToken: string, query?: SoundApiListQuery): Promise<SoundApiListResult>;
  processSound(
    accessToken: string,
    soundId: string,
    payload?: SoundApiProcessPayload
  ): Promise<SoundApiProcessResult>;
  getSoundAudioContracts(
    accessToken: string,
    cacheKey: string,
    mode?: SoundApiDeliveryMode
  ): Promise<SoundApiAudioContractsResult>;
  getSoundAudioBlob(accessToken: string, cacheKey: string): Promise<Blob>;
}
