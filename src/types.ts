/**
 * See https://developer.apple.com/legacy/library/documentation/mac/pdf/MoreMacintoshToolbox.pdf#page=151
 * for more information on resource forks.
 */
import Resource from "./Resource";

export type ResourceMap = Partial<
  Record<string, Partial<Record<string, Resource>>>
>;

export type ResourceForkHeader = {
  dataOff: number;
  mapOff: number;
  dataLen: number;
  mapLen: number;
};
